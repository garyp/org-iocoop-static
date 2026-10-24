---
title: "VPN and Management Server Access"
description: "Set up WireGuard to reach the private network and your server’s IPMI."
group: "Your servers"
order: 3
updated: 2026-03-10
---

In order to reach certain infrastructure in the datacenters you’ll need to first VPN into that
datacenter or SSH through a management server

## VPN Setup

The [console server](https://github.com/iocoop/members/wiki/Console-Server-and-Serial-Aggregator)
hosts a WireGuard VPN providing access to the private LAN. Following are instructions on how to add
new clients.

If you are a coop member with a colocated server, you can use our WireGuard VPN to access your
server’s IPMI interface on the private LAN. To set this up, follow these steps.

1. Generate a keypair.

   ```sh
   (umask 077 &&  wg genkey | tee private.key | wg pubkey) > public.key
   ```

2. [Open a support ticket](/support/) requesting VPN access. Include the contents of `public.key`,
   which is a base64 encoded string.

3. Wait for a response from the ops team.
   [They will set up access and assign a private IP address for your client](https://github.com/iocoop/members/wiki/WireGuard-VPN).

4. Create a config file `/etc/wireguard/iocoop.conf`.

   ```ini
   [Interface]
   PrivateKey = YOUR_PRIVATE_KEY
   Address = 10.0.20.X

   [Peer]
   PublicKey = 7GtxId7m+qDYttGsBNTG4AhibRR/C8VAso3WnDllVUc=
   Endpoint = console.scl.iocoop.org:51820
   AllowedIPs = 10.0.0.0/19
   PersistentKeepalive = 27
   ```

   Be sure to replace `YOUR_PRIVATE_KEY` with the base64 string from your `private.key` file, and
   `10.0.20.X` with the IP address you’ve been assigned by the ops team in step 3. Leave the
   `PublicKey` in the `[Peer]` section unchanged, as that is the key of the IO Coop VPN server.

5. Bring up the interface.

   ```sh
   wg-quick up iocoop
   ```

You should now be on the VPN. To see the connection status at any time, run the `wg` command without
any arguments. You don’t need to retain the .key files as the .conf itself is fully self contained.

If you need multiple clients to connect simultaneously, each one will need its own keypair and IP
address.
