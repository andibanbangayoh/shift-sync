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
  async findOne(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
  ) {
    return this.usersService.findOne(id, user.id, user.role as UserRole);
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
  async updateStaff(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.usersService.updateStaff(
      id,
      user.id,
      user.role as UserRole,
      dto,
    );
  }

  // ── Skills ───────────────────────────────────────────────────────────

  @Post(":id/skills")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addSkill(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Body() dto: AddSkillDto,
  ) {
    return this.usersService.addSkill(
      id,
      dto.skillId,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(":id/skills/:skillId")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeSkill(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Param("skillId") skillId: string,
  ) {
    return this.usersService.removeSkill(
      id,
      skillId,
      user.id,
      user.role as UserRole,
    );
  }

  // ── Certifications (Locations) ───────────────────────────────────────

  @Post(":id/certifications")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addCertification(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Body() dto: AddCertificationDto,
  ) {
    return this.usersService.addCertification(
      id,
      dto.locationId,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(":id/certifications/:locationId")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeCertification(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Param("locationId") locationId: string,
  ) {
    return this.usersService.removeCertification(
      id,
      locationId,
      user.id,
      user.role as UserRole,
    );
  }

  // ── Availability ─────────────────────────────────────────────────────

  @Post(":id/availability")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addAvailability(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Body() dto: AddAvailabilityDto,
  ) {
    return this.usersService.addAvailability(
      id,
      dto,
      user.id,
      user.role as UserRole,
    );
  }

  @Delete(":id/availability/:availabilityId")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeAvailability(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Param("availabilityId") availabilityId: string,
  ) {
    return this.usersService.removeAvailability(
      id,
      availabilityId,
      user.id,
      user.role as UserRole,
    );
  }
}
