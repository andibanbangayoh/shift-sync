import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get("stats")
  getStats(@CurrentUser() user: { id: string; role: string }) {
    return this.dashboardService.getStats(user.id, user.role as any);
  }

  @Get("analytics")
  @UseGuards(RolesGuard)
  @Roles("ADMIN", "MANAGER")
  getAnalytics(
    @CurrentUser() user: { id: string; role: string },
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.dashboardService.getAnalytics(user.id, user.role as any, {
      from,
      to,
      locationId,
    });
  }
}
