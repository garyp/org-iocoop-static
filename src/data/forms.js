// The page-level details of each form. The fields themselves are NOT defined here: django-iocoop
// owns them (iocoop/contacts/serializers.py and iocoop/members/serializers.py) and describes each
// form at GET <resource>/form/, which the browser renders (src/lib/render-form.js). A change to a
// form's fields, labels, help text, options or limits is made in django-iocoop and shows up here
// without touching this repository.
//
// What does live here is what only this site knows:
//   resource       the API resource (see src/data/api.js)
//   serviceName    for the waiting-list warning; `available` comes from `pricing` in site.js, the
//                  same flags that drive the "Currently full" badges. While it is false the form
//                  shows a warning and tells the server (a hidden `waiting_list` field), which tags
//                  the email as a waiting-list request.
//   submitLabel, successMessage, membersOnly (false drops the "Requests are for members" line)
//   notes          text added after a field's help text, for what comes from pricing in site.js
//   counters       textareas that show a character counter
import { pricing } from "./site.js"

const extraDisk = pricing.vps.addons.find((addon) => addon.label === "Extra disk")

export const apiForms = {
  vps: {
    resource: "vps-requests",
    serviceName: "VPS",
    available: pricing.vps.available,
    submitLabel: "Send request",
    successMessage:
      "Thanks, your VPS request is on its way. We'll be in touch as soon as someone can.",
    notes: {
      slices: `${pricing.vps.price} ${pricing.vps.unit}.`,
      extra_disk: `${extraDisk.price} ${extraDisk.unit}.`,
    },
  },

  colocation: {
    resource: "colocation-requests",
    serviceName: "Colocation",
    available: pricing.colo.available,
    submitLabel: "Send request",
    successMessage:
      "Thanks, your colocation request is on its way. We'll be in touch as soon as someone can.",
  },

  join: {
    resource: "membership-applications",
    serviceName: "Membership",
    // Joining is never "full", so there is no waiting list.
    available: true,
    membersOnly: false,
    submitLabel: "Send application",
    successMessage:
      "Thanks, your application is on its way. Someone will be in touch at the email address you gave us.",
  },

  contact: {
    resource: "contact-messages",
    serviceName: "Contact",
    available: true,
    membersOnly: false,
    submitLabel: "Send message",
    successMessage: "Thanks, your message is on its way. We'll reply as soon as someone can.",
    counters: ["message"],
  },
}
