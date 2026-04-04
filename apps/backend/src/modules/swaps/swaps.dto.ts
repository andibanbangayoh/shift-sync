import { IsString, IsOptional, IsIn } from "class-validator";

export class CreateSwapRequestDto {
  /** The assignment the requestor wants to swap/drop. */
  @IsString()
  requestorAssignmentId: string;

  /** "SWAP" or "DROP" */
  @IsIn(["SWAP", "DROP"])
  type: "SWAP" | "DROP";

  /** For SWAP — the assignment of the person you'd like to swap with. */
  @IsString()
  @IsOptional()
  targetAssignmentId?: string;

  /** For SWAP — the target staff member's user id. */
  @IsString()
  @IsOptional()
  targetUserId?: string;
}

export class RespondSwapDto {
  /** "accept" or "reject" — staff B responding to a SWAP request. */
  @IsIn(["accept", "reject"])
  action: "accept" | "reject";
}

export class ResolveSwapDto {
  /** "approve" or "reject" — manager / admin resolving the request. */
  @IsIn(["approve", "reject"])
  action: "approve" | "reject";

  @IsString()
  @IsOptional()
  reason?: string;
}
