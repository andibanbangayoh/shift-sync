import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MinLength,
  Matches,
} from "class-validator";
import { UserRole } from "@prisma/client";

export class CreateStaffDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Password must contain at least one uppercase, one lowercase, and one number",
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  desiredWeeklyHours?: number;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  desiredWeeklyHours?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddSkillDto {
  @IsString()
  @IsNotEmpty()
  skillId!: string;
}

export class AddCertificationDto {
  @IsString()
  @IsNotEmpty()
  locationId!: string;
}

export class AddAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: "startTime must be HH:mm format" })
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: "endTime must be HH:mm format" })
  endTime!: string;
}
