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
 * Safe to re-run: schools already present (matched by exact name) are not
 * duplicated — only their `city` is backfilled if it is still null.
 *
 * Run with: npm run seed:schools
 */
const EXISTING_PARTNER_SCHOOLS: { name: string; city: string }[] = [
  { name: 'Delhi Public School, Mathura Road', city: 'Delhi' },
  { name: 'Modern School, Barakhamba Road', city: 'Delhi' },
  { name: 'Vasant Valley School, South Delhi', city: 'Delhi' },
  { name: 'Delhi Public School, R.K. Puram', city: 'Delhi' },
  { name: "St. Xavier's School, Raj Niwas Marg", city: 'Delhi' },
  { name: 'Sanskriti School, New Delhi', city: 'Delhi' },
  { name: 'Indraprastha World School, Paschim Vihar', city: 'Delhi' },
  { name: 'Kulachi Hansraj, Ashok Vihar', city: 'Delhi' },
  { name: 'Modern School Vasant Vihar, Vasant Vihar', city: 'Delhi' },
  { name: 'Hansraj Model School, Punjabi Bagh', city: 'Delhi' },
  { name: 'St Marks, Paschim Vihar', city: 'Delhi' },
  { name: 'Sachdeva Global, Dwarka', city: 'Delhi' },
  { name: 'Lilawati Vidya, Shakti Nagar', city: 'Delhi' },
  { name: 'DPS, Vasant Kunj', city: 'Delhi' },
  { name: 'Sumermal Jain Public School, Janak Puri', city: 'Delhi' },
  { name: 'Gyan Bharti Public School, Saket', city: 'Delhi' },
  { name: 'Salwan Public School, Rajender Nagar', city: 'Delhi' },
  { name: 'Sardar Patel, Lodhi Estate', city: 'Delhi' },
  { name: 'St Froebel, Paschim Vihar', city: 'Delhi' },
  { name: 'Salwan Public School, Mayur Vihar', city: 'Delhi' },
  { name: 'Venkateshwar International, Dwarka', city: 'Delhi' },
  { name: 'G D Goenka, Dwarka', city: 'Delhi' },
  { name: 'Baptist Convent, IP Extension', city: 'Delhi' },
  { name: 'Bharti Public, Mayur Vihar', city: 'Delhi' },
  { name: 'Angels Public, Vasundhara Enclave', city: 'Delhi' },
  { name: 'Universal Public, Preet Vihar', city: 'Delhi' },
  { name: 'Plato Public, IP Extension', city: 'Delhi' },
  { name: 'Hillwoods Academy, Preet Vihar', city: 'Delhi' },
  { name: 'Ryan International, Mayur Vihar', city: 'Delhi' },
  { name: 'St Andrews Scott, IP Extension', city: 'Delhi' },
  { name: 'Bal Bhavan, IP Extension', city: 'Delhi' },
  { name: 'Evergreen Public, IP Extension', city: 'Delhi' },
  { name: 'The Heritage School, Rohini', city: 'Delhi' },
  { name: 'Bal Bharati, Pitampura', city: 'Delhi' },
  { name: 'Lilawati Vidya, Ashok Vihar', city: 'Delhi' },
  { name: 'Genesis, Noida', city: 'Noida' },
  { name: 'ASPAM Scott, Noida', city: 'Noida' },
  { name: 'Amity, Noida', city: 'Noida' },
  { name: 'Ryan International, Noida', city: 'Noida' },
  { name: 'DPS Greater Noida, Noida', city: 'Noida' },
  { name: 'K R Mangalam, Noida', city: 'Noida' },
  { name: 'Kothari International School, Noida', city: 'Noida' },
  { name: 'Assisi, Noida', city: 'Noida' },
  { name: 'Mayoor, Noida', city: 'Noida' },
  { name: 'Sarvottam International School, Noida', city: 'Noida' },
  { name: 'Lotus Valley, Noida', city: 'Noida' },
  { name: 'Indus Valley, Noida', city: 'Noida' },
  { name: 'Khaitan School, Noida', city: 'Noida' },
  { name: 'Rameesh International, Noida', city: 'Noida' },
  { name: 'Aster Public School, Noida', city: 'Noida' },
  { name: 'Ramagya, Noida', city: 'Noida' },
  { name: 'DPS, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Geeta Sanjay, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Bal Bharti, Yojna Vihar', city: 'Delhi' },
  { name: 'Shri Chaitanya Techno, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Everest Public, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Bhagirath Public, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Presidium, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Ryan International, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Bal Bharti, Brij Vihar, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Ch Chabbil Das, Ghaziabad', city: 'Ghaziabad' },
  { name: 'New Era School, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Indirapuram Public School, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Surevin International, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Radicon International, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Modern National, Ghaziabad', city: 'Ghaziabad' },
  { name: 'Blue Bells, Sector 10, Gurugram', city: 'Gurugram' },
  { name: 'Manav Rachna, Sector 46, Gurugram', city: 'Gurugram' },
  { name: 'DAV, Sector 14, Gurugram', city: 'Gurugram' },
  { name: 'DAV, Sector 49, Gurugram', city: 'Gurugram' },
  { name: 'Lotus Valley, Sector 50, Gurugram', city: 'Gurugram' },
  { name: 'Heritage, Balola, Gurugram', city: 'Gurugram' },
  { name: 'Amity, Sector 46, Gurugram', city: 'Gurugram' },
  { name: 'G D Goenka, Sector 48, Gurugram', city: 'Gurugram' },
  { name: 'Blue Bells, Sector 4, Gurugram', city: 'Gurugram' },
  { name: 'Suncity, Sector 54, Gurugram', city: 'Gurugram' },
  { name: 'Shikshantar, South City, Gurugram', city: 'Gurugram' },
  { name: 'Shiv Nadar, DLF Phase 1, Gurugram', city: 'Gurugram' },
  { name: 'DPS, Maruti Kunj, Gurugram', city: 'Gurugram' },
  { name: 'K R Mangalam, South City 1, Gurugram', city: 'Gurugram' },
  { name: 'Heritage International Xperiential School, Heritage Avenue, Gurugram', city: 'Gurugram' },
  { name: 'Lions Public School, Gurugram', city: 'Gurugram' },
  { name: 'Modern Public, Faridabad', city: 'Faridabad' },
  { name: 'DPS, Sector 19, Faridabad', city: 'Faridabad' },
  { name: 'Shiv Nadar, Faridabad', city: 'Faridabad' },
  { name: 'Manav Rachna, Faridabad', city: 'Faridabad' },
  { name: 'G D Goenka, Faridabad', city: 'Faridabad' },
  { name: 'DAV, Faridabad', city: 'Faridabad' },
  { name: 'Amity, Faridabad', city: 'Faridabad' },
  { name: 'Emerald International, Faridabad', city: 'Faridabad' },
  { name: 'Shree Ram Model School, Faridabad', city: 'Faridabad' },
  { name: 'Aravalli International School, Faridabad', city: 'Faridabad' },
  { name: 'DPS Ghaziabad Society', city: 'Ghaziabad' },
  { name: 'Homerton, Faridabad', city: 'Faridabad' },
  { name: 'Rawal, Faridabad', city: 'Faridabad' },
  { name: 'Modern Vidya Niketan, Faridabad', city: 'Faridabad' },
  { name: 'Vidyasagar International, Faridabad', city: 'Faridabad' },
  { name: 'Dynasty International, Faridabad', city: 'Faridabad' },
]

async function run() {
  await AppDataSource.initialize()
  const repo = AppDataSource.getRepository(School)

  for (const { name, city } of EXISTING_PARTNER_SCHOOLS) {
    const existing = await repo.findOne({ where: { name } })
    if (existing) {
      if (!existing.city) {
        existing.city = city
        await repo.save(existing)
        console.log(`city set (already present): ${name} -> ${city}`)
      } else {
        console.log(`skip (already present): ${name}`)
      }
      continue
    }

    const school = repo.create({
      name,
      city,
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
