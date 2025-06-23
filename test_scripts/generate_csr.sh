openssl genpkey -algorithm RSA -out sfd_client.key -pkeyopt rsa_keygen_bits:2048
openssl req -new -key sfd_client.key -out client.csr
