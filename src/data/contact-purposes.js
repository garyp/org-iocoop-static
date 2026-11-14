// What the contact form's "purpose" menu offers. The values are what django-iocoop's contact
// endpoint accepts (iocoop/api/serializers.py, ContactSerializer.PURPOSES), and the server uses
// them to pick the inbox, so keep the two lists in step. No email addresses live here.
export const contactPurposes = [
  { value: "general", label: "General inquiry" },
  { value: "technical", label: "Technical support" },
  { value: "billing", label: "Billing support" },
  { value: "legal", label: "Legal issue" },
]

export const defaultPurpose = "general"
