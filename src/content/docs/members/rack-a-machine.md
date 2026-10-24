---
title: "Prepare and Rack a Machine"
description: "How to prepare, ship and install a server at the datacenter."
group: "Your servers"
order: 1
updated: 2025-05-05
---

## Summary

Here is an overview of the steps that you must follow to ship a machine to a datacenter.

1. Open a request : [Fill out a request to colocate your server](/services/colocation/)
2. Pay : Pay the invoice that your receive and wait for confirmation in the ticket that you can ship
   your server to the datacenter
3. Prepare the server : Set IPs and label it
4. Prepare the shipment : Prepare the packaging
5. Find someone to deploy : Communicate with other IO Coöperative members to find a member who can
   go to the datacenter to deploy your server. Decide on the date that the member will go to the
   datacenter
6. Ship it : Take the package to an approved shipping carrier on a date that will enable the package
   to arrive at the datacenter within a couple days before the date the IO Coöperative member will
   go to the datacenter to deploy the server. Ship it, and obtain both the estimated arrival date
   and the tracking number
7. Open/update the ticket : Immediately
   [open a support ticket or update the one you already have open](/support/) indicating that there
   is an inbound shipment and providing the required information
8. Communicate with the datacenter : An IO Coöperative ops team member will receive your support
   ticket, create a ticket with the datacenter to alert them to the inbound shipment and the date
   that the IO Coöperative member will be onsite to take possession of the shipment
9. Make sure the server gets deployed : Ensure that the IO Coöperative member that you’ve
   coordinated with to go onsite and deploy your shipped server goes onsite on the date and time you
   agreed on and that was reported in the ticket and to the datacenter and deploys the server

## Open a request

[Fill out a request to colocate your server](/services/colocation/)

## Prepare the server

- Set the IP addresses of the public, private and IPMI network interfaces on the server. These IP
  addresses will have been assigned to you after you opened the support request.
- Label the front and back of the server with the fully qualified domain name of the server which
  you submitted in the support request

## Prepare the shipment

Things to include in the shipment

- A photo of the front and back of the machine with annotation numbers added to network and power
  ports.
- A annotation list which includes things like which NIC is which
- The MAC address and IP address settings for each NIC
- The mounting rails for the server. Without rails the server can not be deployed

If shipping disks non-mounted (say in a nice padded pelican case) of course you should document the
correct mounting positions. Setting the secondary NIC to DHCP will help if the primary NIC’s static
IP has a problem during deployment.

## Find someone to deploy

Email the IO Coöperative members list and ask for a member who lives near the datacenter to help by
deploying your server for you. There is a 30 day window once the shipment arrives for someone to
pick up the shipment before it gets returned to sender so make sure to have someone available and
ready and a date agreed on that they’ll go and deploy.

## Ship it

You can find instructions on shipping your server to HE.net’s Fremont 2 data center at our
[members-only documentation](https://github.com/iocoop/members/wiki/SCL-Hurricane-Electric-HE.net-Datacenter#shipments)
or by filing a support ticket. Ensure that IO Coöperative’s customer number is on the address label!
They will hold it for up to 30 days for whoever is installing it.

Hand your package off to the carrier and obtain both the tracking number for the shipment and the
estimated arrival date.

## Open/update the ticket

Here is the required information that you must put in the ticket

- The carrier name
- The tracking number provided by the carrier
- The estimated arrival date of the package that the carrier provided you
- The number of boxes being shipped
- If the shipment is “oversized”
- The name, email address and phone number of the person who needs to be notified when the shipment
  arrives so they can come deploy the system. This will be the member you’ve arranged with that will
  be taking possession of the shipment when it arrives and deploying the system.
- The date and time that the member who will deploy your server will be taking possession of the
  shipment to deploy it.
