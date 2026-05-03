import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService, AnalyticsData, TimeSeriesData } from './analytics.service';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getAnalytics(): Promise<AnalyticsData> {
    return await this.analyticsService.getAnalytics();
  }

  @Get('timeseries')
  async getTimeSeries(@Query('hours') hours?: string): Promise<TimeSeriesData[]> {
    return await this.analyticsService.getTimeSeriesData(hours ? parseInt(hours) : 24);
  }
}
