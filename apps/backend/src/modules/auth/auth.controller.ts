import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshDto } from "./dto/refresh.dto";
import {
  UpdateSettingsDto,
  AddMyAvailabilityDto,
} from "./dto/update-settings.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("register")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser("id") userId: string, @Body() dto: RefreshDto) {
    await this.authService.logout(userId, dto.refreshToken);
    return { message: "Logged out successfully" };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser("id") userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.authService.updateSettings(userId, dto);
  }

  @Post("me/availability")
  @UseGuards(JwtAuthGuard)
  async setMyDayAvailability(
    @CurrentUser("id") userId: string,
    @Body() dto: AddMyAvailabilityDto,
  ) {
    return this.authService.setMyDayAvailability(userId, dto);
  }

  @Delete("me/availability/:dayOfWeek")
  @UseGuards(JwtAuthGuard)
  async clearMyDayAvailability(
    @CurrentUser("id") userId: string,
    @Param("dayOfWeek") dayOfWeek: string,
  ) {
    return this.authService.clearMyDayAvailability(userId, parseInt(dayOfWeek));
  }

  @Post("me/skills")
  @UseGuards(JwtAuthGuard)
  async addMySkill(
    @CurrentUser("id") userId: string,
    @Body("skillId") skillId: string,
  ) {
    return this.authService.addMySkill(userId, skillId);
  }

  @Delete("me/skills/:skillId")
  @UseGuards(JwtAuthGuard)
  async removeMySkill(
    @CurrentUser("id") userId: string,
    @Param("skillId") skillId: string,
  ) {
    return this.authService.removeMySkill(userId, skillId);
  }
}
