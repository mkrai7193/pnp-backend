import { IsEmail, IsInt, IsNotEmpty, IsString, Matches } from 'class-validator'
import { Type } from 'class-transformer'

const MOBILE_PATTERN = /^[6-9]\d{9}$/

export class CreatePlayerDto {
  @Type(() => Number)
  @IsInt()
  schoolId: number

  @IsString()
  @IsNotEmpty()
  playerName: string

  @IsString()
  @IsNotEmpty()
  dob: string

  @Matches(MOBILE_PATTERN, { message: 'mobile must be a valid 10-digit mobile number.' })
  mobile: string

  @IsEmail()
  email: string
}
