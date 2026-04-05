import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
  Max,
  Matches,
} from "class-validator";

export class UpdateSettingsDto {
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
  @IsBoolean()
  notifyInApp?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;

  @IsOptional()
  @IsNumber()
  desiredWeeklyHours?: number | null;
}

export class AddMyAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "startTime must be HH:mm format" })
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: "endTime must be HH:mm format" })
  endTime!: string;
}
