import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [BotUpdate],
})
export class BotModule { }