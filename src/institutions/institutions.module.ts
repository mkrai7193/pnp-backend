import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { School } from './entities/school.entity'
import { InstitutionsService } from './institutions.service'
import { InstitutionsController } from './institutions.controller'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [TypeOrmModule.forFeature([School]), NotificationsModule],
  controllers: [InstitutionsController],
  providers: [InstitutionsService],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
