import { Body, Controller, Get, GoneException, NotFoundException, Post, Query, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { InstitutionsService } from './institutions.service'
import { CreateSchoolDto } from './dto/create-school.dto'
import { renderVerifyPage } from '../common/verify-page.util'

@Controller('schools')
export class InstitutionsController {
  constructor(
    private readonly institutionsService: InstitutionsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  create(@Body() dto: CreateSchoolDto) {
    return this.institutionsService.create(dto)
  }

  /** Verified schools for the Player Onboarding dropdown. */
  @Get()
  findVerified() {
    return this.institutionsService.findVerified()
  }

  @Get('verify')
  async verify(@Query('token') token: string, @Res() res: Response) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || '/'
    try {
      const school = await this.institutionsService.verifyByToken(token)
      res
        .status(200)
        .type('html')
        .send(
          renderVerifyPage({
            ok: true,
            title: 'School Verified',
            message: `${school.name} (${school.publicId}) is now verified and will appear in the Player Onboarding school list.`,
            frontendUrl,
          }),
        )
    } catch (err) {
      const message =
        err instanceof GoneException || err instanceof NotFoundException
          ? (err.message as string)
          : 'Something went wrong verifying this link.'
      res
        .status(err instanceof GoneException ? 410 : 404)
        .type('html')
        .send(renderVerifyPage({ ok: false, title: 'Verification Failed', message, frontendUrl }))
    }
  }
}
