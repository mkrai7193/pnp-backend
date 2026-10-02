import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { School } from './institutions/entities/school.entity'
import { Player } from './players/entities/player.entity'
import { InstitutionsModule } from './institutions/institutions.module'
import { PlayersModule } from './players/players.module'
import { NotificationsModule } from './notifications/notifications.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'pnp'),
        password: config.get<string>('DB_PASSWORD', 'pnp'),
        database: config.get<string>('DB_DATABASE', 'pnp_sports'),
        entities: [School, Player],
        // Migrations only — never auto-sync a real database from entity metadata.
        synchronize: false,
      }),
    }),
    InstitutionsModule,
    PlayersModule,
    NotificationsModule,
  ],
})
export class AppModule {}
