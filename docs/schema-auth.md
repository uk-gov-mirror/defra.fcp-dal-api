# DAL Schema Authorization

[DAL Authentication](./auth) covers how a caller identifies itself to the DAL (an `email` header, a
Defra ID token, or a `service-account` header). This document covers a separate, later question:
once a caller is identified, which parts of the GraphQL schema is it actually allowed to use?

## The `@auth` directive

```graphql
directive @auth(
  requires: [AuthGroup!]!
  serviceAccountPermitted: Boolean = false
) on OBJECT | FIELD_DEFINITION
```

`@auth` is applied to `Query`/`Mutation` fields (and occasionally whole `OBJECT` types) throughout
the schema, e.g.:

```graphql
business(sbi: ID!): Business @auth(requires: [SINGLE_FRONT_DOOR, CONSOLIDATED_VIEW])
```

It's implemented as a schema transformer, `authDirectiveTransformer` in
[`app/auth/authenticate.js`](../app/auth/authenticate.js), which wraps the field's resolver at
schema-build time. Enforcement happens **at resolve time**, per field - not by hiding the field
from the schema.

### `requires` - which consumer groups can call this field

`requires` names one or more of the AD groups configured in `app/config.js`
(`auth.groups.{ADMIN,CONSOLIDATED_VIEW,SINGLE_FRONT_DOOR,SFI_REFORM}`), each mapping to an Azure AD
Entra group ID for a consuming system (Consolidated View, Single Front Door, the grants platform,
etc).

This comes from a **different** header than the ones in [DAL Authentication](./auth): the caller's
group membership is read from the `groups` claim of the Entra JWT sent in the standard
`Authorization: Bearer <token>` header, verified by `getAuth()` in `authenticate.js`. This identifies
_which system_ is calling the DAL - it's orthogonal to the `email`/`x-forwarded-authorization`/
`service-account` headers, which identify _who the request is on behalf of_. Every field-level
`@auth` check runs against `context.auth.groups`.

A caller in the `ADMIN` group bypasses the `requires` check entirely (and the
`serviceAccountPermitted` check below), regardless of what groups the field lists.

A field with no `@auth` directive at all has no group restriction - anyone who can reach the DAL
can call it (e.g. `Query.referenceData`). A schema test
(`test/graphql/schema.test.js` - `'ensures all sensitive top-level fields have @auth directive'`)
guards against a new top-level field accidentally being left unprotected.

### Cascading from `OBJECT` to fields

`@auth` can be applied to a whole `type`, in which case it's inherited by every field on that type
that doesn't carry its own `@auth`:

```graphql
type Business @auth(requires: [SINGLE_FRONT_DOOR]) {
  sbi: ID!
  info: BusinessInfo # inherits @auth(requires: [SINGLE_FRONT_DOOR])
}
```

A field-level `@auth` always overrides the type-level one for that field.

### `serviceAccountPermitted` - can a service account use this field?

A [service account](./auth) call carries no real end-user identity - it's typically an unattended,
batch-style caller. By default (`serviceAccountPermitted: false`, the default when the argument is
omitted), a service-account caller is **denied** access to an `@auth`-protected field even if it
belongs to a group named in `requires`. A field must opt in explicitly:

```graphql
business(sbi: ID!): Business @auth(requires: [SINGLE_FRONT_DOOR], serviceAccountPermitted: true)
```

This is deliberately opt-in rather than opt-out: most fields are written assuming a real end user
is behind the request, so a new field defaults to being unusable by an unattended caller until
someone has consciously decided that's safe. `serviceAccountPermitted` cascades from `OBJECT` to
fields exactly like `requires` does - setting it at the type level is a conscious decision to open
up every field on that type, in the same way choosing `requires` at the type level is.

Whether the _current_ caller is a service account is derived from the same request-level
`authContext` that [DAL Authentication](./auth) describes (`context.authContext.serviceAccount`,
truthy when a `service-account` header was supplied) - see `app/graphql/context.js` and
`app/auth/end-user-auth-context.js`.

As with `requires`, an `ADMIN`-group caller bypasses the `serviceAccountPermitted` check too - an
admin service account can call any `@auth`-protected field.

### What actually happens when access is denied

`authDirectiveTransformer` wraps the field's resolver with two checks, in order:

1. `checkAuthGroup(requesterGroups, requires)` - throws `Unauthorized` if the caller isn't in
   `ADMIN` or any group in `requires`.
2. `checkServiceAccountAccess(isServiceAccount, serviceAccountPermitted, isAdmin)` - throws
   `Unauthorized` if the caller is a service account, `serviceAccountPermitted` is `false`, and the
   caller isn't `ADMIN`.

Either throw surfaces as a normal GraphQL execution error against that field - the rest of the
query (sibling fields) still resolves normally.

## Introspection filtering

Introspection queries (`__schema`/`__type`) are gated as a whole by the `GRAPHQL_DASHBOARD_ENABLED`
config flag (off by default) - see `app/graphql/server.js`. Where introspection _is_ enabled, a
second layer narrows what each caller sees: `introspectionFilterPlugin`
(`app/graphql/plugins/introspectionFilter.js`) reshapes the introspection response so a caller only
sees the fields its `@auth` policy actually lets it call.

This is a **discoverability convenience, not an additional security boundary**. It only reshapes
the introspection _response_ - it doesn't change the schema object itself. Execution-time
enforcement (above) remains the real access control: a field hidden from introspection, if queried
directly by name, still fails with the same `Unauthorized` error it always would.

- Only a request with **no `Authorization` header at all** sees the full, unfiltered schema. A
  request with a valid-but-unrecognised-group token is treated the same as any other caller with no
  matching entitlements - it only sees ungated fields (plus whatever its groups/service-account
  status do permit).
- Filtering is skipped entirely when `DISABLE_AUTH=true`, since nothing is gated in that mode.
- Every field, gated or not, carries its resolved policy as schema `extensions` metadata
  (`extensions.auth = { requires, serviceAccountPermitted }`, attached by the same
  `authDirectiveTransformer` pass) - `canAccessField()` in `authenticate.js` is the shared,
  non-throwing predicate both the resolver wrapper and the introspection filter use, so the two
  can't drift out of sync.
- Known limitation: this is a best-effort reshape of the response, not a schema-validation-level
  guarantee - e.g. a client that aliases `__schema`/`__type` would evade the filter (and would still
  hit the normal `Unauthorized` error on actually calling a hidden field).

## Local development

Setting `DISABLE_AUTH=true` skips `@auth` enforcement entirely (`getRequestingGroup`/
`getRequestingService` return placeholder values, and `authDirectiveTransformer` isn't applied to
the schema at all). This is only ever allowed when `cdp.env` is `dev` - `schema.js` throws at
startup if auth is disabled anywhere else, so it can't be accidentally left on in a real
environment.

## Where the code lives

| Concern                                           | File                                                          |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `@auth` directive declaration                     | `app/graphql/types/directives.gql`                            |
| `@auth` enforcement, group/service-account checks | `app/auth/authenticate.js`                                    |
| Introspection filtering                           | `app/graphql/plugins/introspectionFilter.js`                  |
| Per-request `authContext` (service-account, etc.) | `app/graphql/context.js`, `app/auth/end-user-auth-context.js` |
| AD group IDs / consumer group config              | `app/config.js` (`auth.groups.*`)                             |

[< back to Homepage](./homepage)
