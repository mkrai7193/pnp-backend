import { ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { School, SchoolSource } from './entities/school.entity'
import { CreateSchoolDto } from './dto/create-school.dto'
import { EmailService } from '../notifications/email.service'
import { buildPublicId } from '../common/public-id.util'
import { generateVerificationToken, tokenExpiryDate } from '../common/verification-token.util'

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(School) private readonly schools: Repository<School>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  /** Verified schools only — this is what populates the Player Onboarding dropdown. */
  async findVerified() {
    const rows = await this.schools.find({
      where: { isVerified: true },
      order: { name: 'ASC' },
      select: ['id', 'publicId', 'name', 'city'],
    })
    return rows
  }

  async create(dto: CreateSchoolDto) {
    const existing = await this.schools.findOne({ where: { email: dto.schoolEmail } })
    if (existing) {
      throw new ConflictException('A school with this email is already registered.')
    }

    const token = generateVerificationToken()
    const school = this.schools.create({
      name: dto.schoolName,
      principalName: dto.principalName,
      email: dto.schoolEmail,
      mobile: dto.schoolMobile,
      hodName: dto.hodName,
      hodMobile: dto.hodMobile,
      hodEmail: dto.hodEmail,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      address: dto.address ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      zipCode: dto.zipCode ?? null,
      source: SchoolSource.FORM_SUBMISSION,
      isVerified: false,
      verificationToken: token,
      verificationTokenExpiresAt: tokenExpiryDate(),
    })
    await this.schools.save(school)

    school.publicId = buildPublicId('SCH', school.id, school.createdAt)
    await this.schools.save(school)

    const verifyUrl = `${this.config.get<string>('BACKEND_PUBLIC_URL')}/api/schools/verify?token=${token}`
    const emailSent = await this.emailService.sendVerificationEmail({
      to: dto.schoolEmail,
      recipientName: dto.principalName,
      subject: `PNP Sports: Verify your email — ${dto.schoolName}`,
      heading: 'Confirm your school registration',
      publicId: school.publicId,
      verifyUrl,
      recap: [
        { label: 'School Name', value: dto.schoolName },
        { label: 'Principal', value: dto.principalName },
        { label: 'School Email', value: dto.schoolEmail },
        { label: 'School Contact', value: dto.schoolMobile },
        { label: 'HOD Name', value: dto.hodName },
        { label: 'HOD Mobile', value: dto.hodMobile },
        { label: 'HOD Email', value: dto.hodEmail },
        { label: 'Address', value: dto.address || '—' },
        { label: 'City', value: dto.city || '—' },
        { label: 'State', value: dto.state || '—' },
        { label: 'Zip / Postal Code', value: dto.zipCode || '—' },
      ],
    })

    return {
      ok: true,
      id: school.publicId,
      emailSent,
      message: emailSent
        ? `We've sent a verification email to ${dto.schoolEmail}. Please check your inbox (and spam folder) and verify to complete registration.`
        : "We've saved your registration, but the verification email couldn't be sent right now. Please contact us so we can verify your school manually.",
    }
  }

  async verifyByToken(token: string): Promise<School> {
    const school = await this.schools.findOne({ where: { verificationToken: token } })
    if (!school) {
      throw new NotFoundException('This verification link is invalid.')
    }
    if (school.isVerified) {
      return school
    }
    if (!school.verificationTokenExpiresAt || school.verificationTokenExpiresAt < new Date()) {
      throw new GoneException('This verification link has expired. Please register again.')
    }

    school.isVerified = true
    school.verifiedAt = new Date()
    school.verificationToken = null
    school.verificationTokenExpiresAt = null
    await this.schools.save(school)
    return school
  }
}
