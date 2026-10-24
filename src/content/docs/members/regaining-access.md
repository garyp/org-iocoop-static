---
title: "Regaining access to your server or VPS"
description: "Your options when you can’t reach a colocated server or VPS."
group: "Your servers"
order: 2
updated: 2026-02-02
---

If you’re unable to reach your colocated server or VPS, here are your options.

## Colocated Servers

- **Out of band manage your server : (Instantaneous) (Self-Service)** If your server has an
  [out of band management card](https://en.wikipedia.org/wiki/Out-of-band_management)/[IPMI](https://en.wikipedia.org/wiki/Intelligent_Platform_Management_Interface)
  built in and that card is plugged into the private/internal network, you can use it to regain
  access to your server. You can VPN or SSH into the private network and from there access your
  remote access card. If you don’t have access to the private network,
  [Open a support request](/support/) to establish it.
- **Request that your server be power cycled : (Fast) (Volunteer Supported)** Anyone on the IO
  Coöperative Operations team can assist you by power cycling your server.
  [Open a support request](/support/) using the email address that is associated with your member
  account. Request the server be power cycled. _Note, we would like to enable direct member access
  to execute power cycles on servers they own but don’t currently have a method to provide the
  access control needed on the PDUs to accomplish this. If you wish to help with this please contact
  the IO Coöperative operations team to volunteer to help with the project._
  - Provide : Hostname of the server and datacenter that it’s colocated in.
- **Have datacenter employees provide hands and eyes on your server : (Fast) (Volunteer Supported)**
  You can have the IO Coöperative Ops team request hands and eyes support from a datacenter
  employee. [Open a support ticket](/support/) with IO Coöperative requesting that a datacenter
  hands and eyes support ticket be opened. Our current datacenter
  [doesn’t charge for simple server power cycles](https://www.he.net/tour/Fremont_2_220_Remote_Hands_Service.html).
  - Provide : Hostname of the server
- **Have an IO Coöperative member go to the datacenter : (Slow) (Volunteer Supported)** If you’re
  unable to get your server to recover using the remote power cycle or serial console, you can
  either go to the datacenter yourself (if you are approved to do so), go to the datacenter with an
  IO Coöperative member escort (if you are not yet approved to go to the datacenter alone), or ask
  an IO Coöperative member to go to the datacenter for you to help you resolve the server issue. The
  best way to set this up is to first,
  [visit the Matrix channel](https://matrix.to/#/!FNzFwuFmhfyMdXlxhn:libera.chat?via=libera.chat&via=matrix.org)
  and ask if someone who lives or works near the datacenter can help you out. If Matrix doesn’t get
  you a very quick response,
  [email the IO Coöperative members mailing list](/docs/members/email-lists/) asking if someone who
  lives or works near the datacenter can help you out.
  - Provide : Hostname of the server

## Virtual Private Servers (VPS)

- **Reboot your VPS using the [Control and Command interface](/docs/members/vps-control/) :
  (Instantaneous) (Self-Service)**
- **VNC into your VPS’s console using the
  [Control and Command interface](/docs/members/vps-control/) : (Instantaneous) (Self-Service)**
- **Have the IO Coöperative Operations team troubleshoot your VPS issue directly : (Fast) (Volunteer
  Supported)** If you’re unable to reboot or VNC into your VPS server,
  [open a support ticket](/support/) indicating what you’ve tried and what isn’t working. An IO
  Coöperative operations team member will connect to the VPS host systems to troubleshoot the issue.
  - Provide : Hostname of the server
