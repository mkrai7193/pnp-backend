import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Player } from './entities/player.entity'
import { School } from '../institutions/entities/school.entity'
import { CreatePlayerDto } from './dto/create-player.dto'
import { EmailService } from '../notifications/email.service'
import { buildPublicId } from '../common/public-id.util'
import { generateVerificationToken, tokenExpiryDate } from '../common/verification-token.util'

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player) private readonly players: Repository<Player>,
    @InjectRepository(School) private readonly schools: Repository<School>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreatePlayerDto) {
    const school = await this.schools.findOne({ where: { id: dto.schoolId } })
    if (!school) {
      throw new NotFoundException('Selected school was not found.')
    }
    if (!school.isVerified) {
      throw new BadRequestException('Selected school has not completed email verification yet.')
    }

    const existing = await this.players.findOne({ where: { email: dto.email } })
    if (existing) {
      throw new ConflictException('A player with this email is already registered.')
    }

    const token = generateVerificationToken()
    const player = this.players.create({
      school,
      schoolId: school.id,
      playerName: dto.playerName,
      dob: dto.dob,
      mobile: dto.mobile,
      email: dto.email,
      isVerified: false,
      verificationToken: token,
      verificationTokenExpiresAt: tokenExpiryDate(),
    })
    await this.players.save(player)

    player.publicId = buildPublicId('PLY', player.id, player.createdAt)
    await this.players.save(player)

    const verifyUrl = `${this.config.get<string>('BACKEND_PUBLIC_URL')}/api/players/verify?token=${token}`
    const emailSent = await this.emailService.sendVerificationEmail({
      to: dto.email,
      recipientName: dto.playerName,
      subject: `PNP Sports: Verify your email — ${dto.playerName}`,
      heading: 'Confirm your player registration',
      publicId: player.publicId,
      verifyUrl,
      recap: [
        { label: 'School', value: school.name },
        { label: 'Player Name', value: dto.playerName },
        { label: 'Date of Birth', value: dto.dob },
        { label: 'Mobile', value: dto.mobile },
        { label: 'Email', value: dto.email },
      ],
    })

    return {
      ok: true,
      id: player.publicId,
      emailSent,
      message: emailSent
        ? `We've sent a verification email to ${dto.email}. Please check your inbox (and spam folder) and verify to complete registration.`
        : "We've saved your registration, but the verification email couldn't be sent right now. Please contact us so we can verify your account manually.",
    }
  }

  async verifyByToken(token: string): Promise<Player> {
    const player = await this.players.findOne({ where: { verificationToken: token }, relations: ['school'] })
    if (!player) {
      throw new NotFoundException('This verification link is invalid.')
    }
    if (player.isVerified) {
      return player
    }
    if (!player.verificationTokenExpiresAt || player.verificationTokenExpiresAt < new Date()) {
      throw new GoneException('This verification link has expired. Please register again.')
    }

    player.isVerified = true
    player.verifiedAt = new Date()
    player.verificationToken = null
    player.verificationTokenExpiresAt = null
    await this.players.save(player)
    return player
  }
}
