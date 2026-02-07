import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BotModule } from './bot/bot.module';
import { GrammyCoreModule } from '@grammyjs/nestjs';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GrammyCoreModule.forRootAsync({
      useFactory: () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
        }
        return { token };
      },
    }),
    PrismaModule,
    BotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
