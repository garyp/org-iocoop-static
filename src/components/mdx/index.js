import AddOns from "./AddOns.astro"
import BoardMembers from "./BoardMembers.astro"
import Callout from "./Callout.astro"
import Faq from "./Faq.astro"
import FaqItem from "./FaqItem.astro"
import Field from "./Field.astro"
import Fields from "./Fields.astro"
import PricingSummary from "./PricingSummary.astro"
import RequestForm from "../RequestForm.astro"
import ServiceCards from "./ServiceCards.astro"
import SliceTable from "./SliceTable.astro"

// Components available in every .mdx page without importing them.
export const mdxComponents = {
  AddOns,
  BoardMembers,
  Callout,
  Faq,
  FaqItem,
  Field,
  Fields,
  PricingSummary,
  RequestForm,
  ServiceCards,
  SliceTable,
}
