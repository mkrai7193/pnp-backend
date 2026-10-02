import { IsEmail, IsNotEmpty, IsNumberString, IsOptional, IsString, Length, Matches } from 'class-validator'

const MOBILE_PATTERN = /^[6-9]\d{9}$/

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty()
  schoolName: string

  @IsString()
  @IsNotEmpty()
  principalName: string

  @IsEmail()
  schoolEmail: string

  @Matches(MOBILE_PATTERN, { message: 'schoolMobile must be a valid 10-digit mobile number.' })
  schoolMobile: string

  @IsString()
  @IsNotEmpty()
  hodName: string

  @Matches(MOBILE_PATTERN, { message: 'hodMobile must be a valid 10-digit mobile number.' })
  hodMobile: string

  @IsEmail()
  hodEmail: string

  @IsOptional()
  @IsNumberString()
  latitude?: string

  @IsOptional()
  @IsNumberString()
  longitude?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  zipCode?: string
}
