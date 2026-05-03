import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ChallengeService, Challenge, ChallengeRequest } from './challenge.service';

@Controller('api/challenge')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Post('generate')
  async generateChallenge(@Body() request: ChallengeRequest): Promise<Challenge> {
    try {
      return await this.challengeService.generateChallenge(request);
    } catch (error) {
      throw new HttpException('Failed to generate challenge', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getChallenge(@Param('id') id: string): Promise<Challenge> {
    const challenge = await this.challengeService.getChallengeById(id);
    if (!challenge) {
      throw new HttpException('Challenge not found', HttpStatus.NOT_FOUND);
    }
    return challenge;
  }
}
