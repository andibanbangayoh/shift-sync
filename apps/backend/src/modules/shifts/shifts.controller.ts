import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ShiftsService } from "./shifts.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CreateShiftDto,
  UpdateShiftDto,
  AssignStaffDto,
  MoveShiftDto,
} from "./shifts.dto";

@Controller("shifts")
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  /**
   * GET /api/shifts?weekStart=2026-04-06&weekEnd=2026-04-12&locationId=xxx
   */
  @Get()
  listShifts(
    @CurrentUser() user: { id: string; role: string },
    @Query("weekStart") weekStart: string,
    @Query("weekEnd") weekEnd: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.shiftsService.listShifts(
      user.id,
      user.role as any,
      weekStart,
      weekEnd,
      locationId,
    );
  }

  /** GET /api/shifts/locations — available locations for the current user. */
  @Get("locations")
  getLocations(@CurrentUser() user: { id: string; role: string }) {
    return this.shiftsService.getLocations(user.id, user.role as any);
  }

  /** GET /api/shifts/skills — all skills. */
  @Get("skills")
  getSkills() {
    return this.shiftsService.getSkills();
  }

  /** GET /api/shifts/eligible-staff?locationId=x&skillId=y&shiftId=z&date=..&startTime=..&endTime=.. */
  @Get("eligible-staff")
  @UseGuards(RolesGuard)
  @Roles("ADMIN" as any, "MANAGER" as any)
  getEligibleStaff(
    @CurrentUser() user: { id: string; role: string },
    @Query("locationId") locationId: string,
    @Query("skillId") skillId?: string,
    @Query("shiftId") shiftId?: string,
    @Query("date") date?: string,
    @Query("startTime") startTime?: string,
    @Query("endTime") endTime?: string,
  ) {
    return this.shiftsService.getEligibleStaff(
      user.id,
      user.role as any,
      locationId,
      skillId,
      shiftId,
      date,
      startTime,
      endTime,
    );
  }

  /** POST /api/shifts — create a new shift. */
  @Post()
  @UseGuards(RolesGuard)
  @Roles("ADMIN" as any, "MANAGER" as any)
  createShift(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateShiftDto,
  ) {
    return this.shiftsService.createShift(user.id, user.role as any, dto);
  }

  /** PATCH /api/shifts/:id — update shift details. */
  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN" as any, "MANAGER" as any)
  updateShift(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.shiftsService.updateShift(user.id, user.role as any, id, dto);
  }

  /** PATCH /api/shifts/:id/move — drag-and-drop move. */
  @Patch(":id/move")
  @UseGuards(RolesGuard)
  @Roles("ADMIN" as any, "MANAGER" as any)
  moveShift(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Body() dto: MoveShiftDto,
  ) {
    return this.shiftsService.moveShift(user.id, user.role as any, id, dto);
  }

  /** POST /api/shifts/:id/assign — assign staff to shift. */
  @Post(":id/assign")
  @UseGuards(RolesGuard)
  @Roles("ADMIN" as any, "MANAGER" as any)
  assignStaff(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") shiftId: string,
    @Body() dto: AssignStaffDto,
  ) {
    return this.shiftsService.assignStaff(
      user.id,
      user.role as any,
      shiftId,
      dto,
    );
  }

  /** DELETE /api/shifts/:id/assign/:assignmentId — remove assignment. */
  @Delete(":id/assign/:assignmentId")
  @UseGuards(RolesGuard)
  @Roles("ADMIN" as any, "MANAGER" as any)
  unassignStaff(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") shiftId: string,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.shiftsService.unassignStaff(
      user.id,
      user.role as any,
      shiftId,
      assignmentId,
    );
  }

  /** DELETE /api/shifts/:id — delete a draft shift. */
  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("ADMIN" as any, "MANAGER" as any)
  deleteShift(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
  ) {
    return this.shiftsService.deleteShift(user.id, user.role as any, id);
  }

  /** GET /api/shifts/:id/what-if/:userId — preview assignment impact. */
  @Get(":id/what-if/:userId")
  @UseGuards(RolesGuard)
  @Roles("ADMIN" as any, "MANAGER" as any)
  whatIfAssign(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") shiftId: string,
    @Param("userId") staffUserId: string,
  ) {
    return this.shiftsService.whatIfAssign(
      user.id,
      user.role as any,
      shiftId,
      staffUserId,
    );
  }
}
