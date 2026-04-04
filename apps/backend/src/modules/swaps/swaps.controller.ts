import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { SwapsService } from "./swaps.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CreateSwapRequestDto,
  RespondSwapDto,
  ResolveSwapDto,
} from "./swaps.dto";
import { SwapRequestStatus } from "@prisma/client";

@Controller("swaps")
@UseGuards(JwtAuthGuard)
export class SwapsController {
  constructor(private swapsService: SwapsService) {}

  /** GET /api/swaps?status=PENDING */
  @Get()
  listSwapRequests(
    @CurrentUser() user: { id: string; role: string },
    @Query("status") status?: SwapRequestStatus,
  ) {
    return this.swapsService.listSwapRequests(
      user.id,
      user.role as any,
      status,
    );
  }

  /** GET /api/swaps/stats */
  @Get("stats")
  getSwapStats(@CurrentUser() user: { id: string; role: string }) {
    return this.swapsService.getSwapStats(user.id, user.role as any);
  }

  /** GET /api/swaps/coworkers?locationId=x&shiftStart=x&shiftEnd=x */
  @Get("coworkers")
  getCoworkers(
    @CurrentUser() user: { id: string; role: string },
    @Query("locationId") locationId: string,
    @Query("shiftStart") shiftStart: string,
    @Query("shiftEnd") shiftEnd: string,
  ) {
    return this.swapsService.getCoworkers(
      user.id,
      locationId,
      shiftStart,
      shiftEnd,
    );
  }

  /** POST /api/swaps — staff creates a swap/drop request. */
  @Post()
  createSwapRequest(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: CreateSwapRequestDto,
  ) {
    return this.swapsService.createSwapRequest(user.id, dto);
  }

  /** PATCH /api/swaps/:id/respond — target staff accepts/rejects. */
  @Patch(":id/respond")
  respondToSwap(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Body() dto: RespondSwapDto,
  ) {
    return this.swapsService.respondToSwap(user.id, id, dto);
  }

  /** PATCH /api/swaps/:id/resolve — manager/admin approves/rejects. */
  @Patch(":id/resolve")
  @UseGuards(RolesGuard)
  @Roles("ADMIN" as any, "MANAGER" as any)
  resolveSwapRequest(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
    @Body() dto: ResolveSwapDto,
  ) {
    return this.swapsService.resolveSwapRequest(
      user.id,
      user.role as any,
      id,
      dto,
    );
  }

  /** PATCH /api/swaps/:id/cancel — requestor cancels their own. */
  @Patch(":id/cancel")
  cancelSwapRequest(
    @CurrentUser() user: { id: string; role: string },
    @Param("id") id: string,
  ) {
    return this.swapsService.cancelSwapRequest(user.id, id);
  }
}
