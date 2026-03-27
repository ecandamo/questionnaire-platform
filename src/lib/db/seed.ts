import { db } from "./index"
import { question, questionCategory, questionnaireTemplate, templateQuestion } from "./schema"

/**
 * Seeds the database with initial categories, questions, and preset templates.
 * Run with: npx tsx src/lib/db/seed.ts
 */
async function seed() {
  console.log("Seeding database...")

  // ─── Categories ─────────────────────────────────────────────────────────────

  const [generalCat] = await db
    .insert(questionCategory)
    .values({ name: "General", description: "General business information", sortOrder: 0 })
    .returning()
    .onConflictDoNothing()

  const [financialCat] = await db
    .insert(questionCategory)
    .values({ name: "Financial", description: "Financial data and metrics", sortOrder: 1 })
    .returning()
    .onConflictDoNothing()

  const [operationalCat] = await db
    .insert(questionCategory)
    .values({ name: "Operational", description: "Operational processes and systems", sortOrder: 2 })
    .returning()
    .onConflictDoNothing()

  const [techCat] = await db
    .insert(questionCategory)
    .values({ name: "Technology", description: "Technology stack and systems", sortOrder: 3 })
    .returning()
    .onConflictDoNothing()

  console.log("Categories created")

  // ─── Questions ───────────────────────────────────────────────────────────────

  // Data Request questions
  const dataRequestQs = await db
    .insert(question)
    .values([
      { text: "Company Overview", type: "section_header", categoryId: generalCat?.id, sortOrder: 0, isRequired: false },
      { text: "What is the full legal name of your company?", type: "short_text", categoryId: generalCat?.id, sortOrder: 1, isRequired: true },
      { text: "What industry does your company operate in?", type: "short_text", categoryId: generalCat?.id, sortOrder: 2, isRequired: true },
      { text: "How many employees does your company have?", type: "number", categoryId: generalCat?.id, sortOrder: 3, isRequired: true },
      { text: "What are your primary geographic markets?", type: "long_text", categoryId: generalCat?.id, sortOrder: 4, isRequired: false },
      { text: "Financial Overview", type: "section_header", categoryId: financialCat?.id, sortOrder: 5, isRequired: false },
      { text: "What is your company's annual revenue (USD)?", type: "currency", categoryId: financialCat?.id, sortOrder: 6, isRequired: true },
      { text: "What is your current gross margin?", type: "percentage", categoryId: financialCat?.id, sortOrder: 7, isRequired: false },
      { text: "What is your annual budget for technology and software?", type: "currency", categoryId: financialCat?.id, sortOrder: 8, isRequired: false },
      { text: "What is your fiscal year end date?", type: "date", categoryId: financialCat?.id, sortOrder: 9, isRequired: false },
      { text: "Operations", type: "section_header", categoryId: operationalCat?.id, sortOrder: 10, isRequired: false },
      { text: "How many locations does your company operate from?", type: "number", categoryId: operationalCat?.id, sortOrder: 11, isRequired: false },
      { text: "Describe your primary business processes and workflows.", type: "long_text", categoryId: operationalCat?.id, sortOrder: 12, isRequired: false },
    ])
    .returning()
    .onConflictDoNothing()

  // Hobson ROI questions
  const roiQs = await db
    .insert(question)
    .values([
      { text: "Current State", type: "section_header", categoryId: generalCat?.id, sortOrder: 0, isRequired: false },
      { text: "How would you describe your current process for handling this function?", type: "long_text", categoryId: operationalCat?.id, sortOrder: 1, isRequired: true },
      { text: "How many FTEs are dedicated to this function?", type: "number", categoryId: operationalCat?.id, sortOrder: 2, isRequired: true },
      { text: "What is the average fully-loaded cost per FTE (USD/year)?", type: "currency", categoryId: financialCat?.id, sortOrder: 3, isRequired: true },
      { text: "How many hours per week does the team spend on manual tasks?", type: "number", categoryId: operationalCat?.id, sortOrder: 4, isRequired: true },
      { text: "Pain Points", type: "section_header", categoryId: operationalCat?.id, sortOrder: 5, isRequired: false },
      { text: "What are the top 3 inefficiencies in your current process?", type: "long_text", categoryId: operationalCat?.id, sortOrder: 6, isRequired: true },
      { text: "What is the business impact of these inefficiencies?", type: "long_text", categoryId: operationalCat?.id, sortOrder: 7, isRequired: false },
      { text: "ROI Goals", type: "section_header", categoryId: financialCat?.id, sortOrder: 8, isRequired: false },
      { text: "What ROI percentage would make this investment compelling?", type: "percentage", categoryId: financialCat?.id, sortOrder: 9, isRequired: false },
      { text: "What is your target payback period?", type: "single_select", categoryId: financialCat?.id, sortOrder: 10, isRequired: false, options: ["< 6 months", "6-12 months", "12-18 months", "18-24 months", "2+ years"] },
      { text: "What is your decision timeline?", type: "single_select", categoryId: generalCat?.id, sortOrder: 11, isRequired: false, options: ["This month", "This quarter", "This year", "No specific timeline"] },
    ])
    .returning()
    .onConflictDoNothing()

  // Workshop questions
  const workshopQs = await db
    .insert(question)
    .values([
      { text: "Workshop Logistics", type: "section_header", categoryId: generalCat?.id, sortOrder: 0, isRequired: false },
      { text: "How many attendees do you expect for the workshop?", type: "number", categoryId: generalCat?.id, sortOrder: 1, isRequired: true },
      { text: "What is your preferred workshop format?", type: "single_select", categoryId: generalCat?.id, sortOrder: 2, isRequired: true, options: ["In-person", "Virtual", "Hybrid"] },
      { text: "What is your preferred workshop duration?", type: "single_select", categoryId: generalCat?.id, sortOrder: 3, isRequired: false, options: ["Half day (4 hours)", "Full day (8 hours)", "Two days", "Multi-day"] },
      { text: "What is the preferred date range for the workshop?", type: "short_text", categoryId: generalCat?.id, sortOrder: 4, isRequired: false },
      { text: "Attendee Roles", type: "section_header", categoryId: generalCat?.id, sortOrder: 5, isRequired: false },
      { text: "What roles/functions will be represented?", type: "multi_select", categoryId: generalCat?.id, sortOrder: 6, isRequired: false, options: ["Executive Leadership", "Finance", "Operations", "IT/Technology", "Sales", "Marketing", "HR", "Other"] },
      { text: "Will executive sponsors attend?", type: "yes_no", categoryId: generalCat?.id, sortOrder: 7, isRequired: false },
      { text: "Workshop Goals", type: "section_header", categoryId: generalCat?.id, sortOrder: 8, isRequired: false },
      { text: "What are the primary goals you want to achieve?", type: "long_text", categoryId: generalCat?.id, sortOrder: 9, isRequired: true },
      { text: "What does success look like for this workshop?", type: "long_text", categoryId: generalCat?.id, sortOrder: 10, isRequired: false },
    ])
    .returning()
    .onConflictDoNothing()

  console.log("Questions created")

  // ─── Templates ───────────────────────────────────────────────────────────────

  if (dataRequestQs && dataRequestQs.length > 0) {
    const [dataTemplate] = await db
      .insert(questionnaireTemplate)
      .values({ name: "Data Request (Adhoc)", type: "data_request", description: "Standard data collection questionnaire for prospect discovery" })
      .returning()
      .onConflictDoNothing()

    if (dataTemplate) {
      await db.insert(templateQuestion).values(
        dataRequestQs.map((q, i) => ({
          templateId: dataTemplate.id,
          questionId: q.id,
          sortOrder: i,
          isRequired: q.isRequired,
        }))
      ).onConflictDoNothing()
      console.log("Data Request template seeded")
    }
  }

  if (roiQs && roiQs.length > 0) {
    const [roiTemplate] = await db
      .insert(questionnaireTemplate)
      .values({ name: "Hobson ROI", type: "hobson_roi", description: "ROI analysis questionnaire to quantify business impact" })
      .returning()
      .onConflictDoNothing()

    if (roiTemplate) {
      await db.insert(templateQuestion).values(
        roiQs.map((q, i) => ({
          templateId: roiTemplate.id,
          questionId: q.id,
          sortOrder: i,
          isRequired: q.isRequired,
        }))
      ).onConflictDoNothing()
      console.log("Hobson ROI template seeded")
    }
  }

  if (workshopQs && workshopQs.length > 0) {
    const [workshopTemplate] = await db
      .insert(questionnaireTemplate)
      .values({ name: "Workshop", type: "workshop", description: "Workshop planning and logistics questionnaire" })
      .returning()
      .onConflictDoNothing()

    if (workshopTemplate) {
      await db.insert(templateQuestion).values(
        workshopQs.map((q, i) => ({
          templateId: workshopTemplate.id,
          questionId: q.id,
          sortOrder: i,
          isRequired: q.isRequired,
        }))
      ).onConflictDoNothing()
      console.log("Workshop template seeded")
    }
  }

  console.log("Seed complete!")
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
