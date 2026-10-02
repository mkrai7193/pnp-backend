import 'reflect-metadata'
import { AppDataSource } from '../src/database/data-source'
import { School, SchoolSource } from '../src/institutions/entities/school.entity'
import { buildPublicId } from '../src/common/public-id.util'

/**
 * One-time seed of the schools already listed in
 * pnp-web/src/data/partnerSchools.js (the "Other / Not Listed" UI fallback
 * excluded — it isn't a real school). These names are the only verified
 * fact we have about these partners; principal/contact details are not
 * fabricated (see GUIDELINES.md §7) and stay null until the school itself
 * submits the onboarding form or an admin fills them in later.
 *
 * Seeded rows are pre-verified (source: 'seed') so they show up in the
 * Player Onboarding dropdown immediately, matching how they already behave
 * today via the static partnerSchools.js file.
 *
 * Run with: npm run seed:schools
 */
const EXISTING_PARTNER_SCHOOLS = [
  'Delhi Public School, Mathura Road',
  'Modern School, Barakhamba Road',
  'Vasant Valley School, South Delhi',
  'Delhi Public School, R.K. Puram',
  "St. Xavier's School, Raj Niwas Marg",
  'Sanskriti School, New Delhi',
  'Indraprastha World School, Paschim Vihar',
  'Kulachi Hansraj, Ashok Vihar',
  'Modern School Vasant Vihar, Vasant Vihar',
  'Hansraj Model School, Punjabi Bagh',
  'St Marks, Paschim Vihar',
  'Sachdeva Global, Dwarka',
  'Lilawati Vidya, Shakti Nagar',
  'DPS, Vasant Kunj',
  'Sumermal Jain Public School, Janak Puri',
  'Gyan Bharti Public School, Saket',
  'Salwan Public School, Rajender Nagar',
]

async function run() {
  await AppDataSource.initialize()
  const repo = AppDataSource.getRepository(School)

  for (const name of EXISTING_PARTNER_SCHOOLS) {
    const existing = await repo.findOne({ where: { name } })
    if (existing) {
      console.log(`skip (already present): ${name}`)
      continue
    }

    const school = repo.create({
      name,
      source: SchoolSource.SEED,
      isVerified: true,
      verifiedAt: new Date(),
    })
    await repo.save(school)
    school.publicId = buildPublicId('SCH', school.id, school.createdAt)
    await repo.save(school)
    console.log(`seeded: ${name} -> ${school.publicId}`)
  }

  await AppDataSource.destroy()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
