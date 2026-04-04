import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "@prisma/client";
import {
  CreateStaffDto,
  UpdateStaffDto,
  AddSkillDto,
  AddCertificationDto,
  AddAvailabilityDto,
} from "./users.dto";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query("role") role?: UserRole,
    @Query("search") search?: string,
  ) {
    return this.usersService.findAll(user.id, user.role as UserRole, {
      role,
      search,
    });
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createStaff(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateStaffDto,
  ) {
    return this.usersService.createStaff(user.role as UserRole, dto);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateStaff(@Param("id") id: string, @Body() dto: UpdateStaffDto) {
    return this.usersService.updateStaff(id, dto);
  }

  // ── Skills ───────────────────────────────────────────────────────────

  @Post(":id/skills")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addSkill(@Param("id") id: string, @Body() dto: AddSkillDto) {
    return this.usersService.addSkill(id, dto.skillId);
  }

  @Delete(":id/skills/:skillId")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeSkill(
    @Param("id") id: string,
    @Param("skillId") skillId: string,
  ) {
    return this.usersService.removeSkill(id, skillId);
  }

  // ── Certifications (Locations) ───────────────────────────────────────

  @Post(":id/certifications")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addCertification(
    @Param("id") id: string,
    @Body() dto: AddCertificationDto,
  ) {
    return this.usersService.addCertification(id, dto.locationId);
  }

  @Delete(":id/certifications/:locationId")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeCertification(
    @Param("id") id: string,
    @Param("locationId") locationId: string,
  ) {
    return this.usersService.removeCertification(id, locationId);
  }

  // ── Availability ─────────────────────────────────────────────────────

  @Post(":id/availability")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addAvailability(
    @Param("id") id: string,
    @Body() dto: AddAvailabilityDto,
  ) {
    return this.usersService.addAvailability(id, dto);
  }

  @Delete(":id/availability/:availabilityId")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeAvailability(
    @Param("id") id: string,
    @Param("availabilityId") availabilityId: string,
  ) {
    return this.usersService.removeAvailability(availabilityId);
  }
}
