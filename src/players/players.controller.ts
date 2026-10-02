import { Body, Controller, Get, GoneException, NotFoundException, Post, Query, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { PlayersService } from './players.service'
import { CreatePlayerDto } from './dto/create-player.dto'
import { renderVerifyPage } from '../common/verify-page.util'

@Controller('players')
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  create(@Body() dto: CreatePlayerDto) {
    return this.playersService.create(dto)
  }

  @Get('verify')
  async verify(@Query('token') token: string, @Res() res: Response) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || '/'
    try {
      const player = await this.playersService.verifyByToken(token)
      res
        .status(200)
        .type('html')
        .send(
          renderVerifyPage({
            ok: true,
            title: 'Player Verified',
            message: `${player.playerName} (${player.publicId}) is now verified. You'll be notified once trials and team selection open.`,
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
