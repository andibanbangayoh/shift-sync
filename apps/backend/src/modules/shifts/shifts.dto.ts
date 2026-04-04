import {
  IsString,
  IsInt,
  IsDateString,
  Min,
  IsOptional,
  IsIn,
} from "class-validator";

export class CreateShiftDto {
  @IsString()
  locationId: string;

  @IsDateString()
  date: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  requiredSkillId: string;

  @IsInt()
  @Min(1)
  headcount: number;

  /** "none" | "daily" | "weekly" — defaults to "none" */
  @IsIn(["none", "daily", "weekly"])
  @IsOptional()
  recurrence?: "none" | "daily" | "weekly";

  /** How many occurrences to create (including the first). Max 12 weeks. */
  @IsInt()
  @Min(1)
  @IsOptional()
  recurrenceCount?: number;
}

export class UpdateShiftDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  requiredSkillId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  headcount?: number;

  @IsIn(["DRAFT", "PUBLISHED", "CANCELLED"])
  @IsOptional()
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED";

  @IsInt()
  version: number; // optimistic locking
}

export class AssignStaffDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  overrideReason?: string;
}

export class MoveShiftDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsDateString()
  date: string;

  @IsInt()
  version: number;
}
