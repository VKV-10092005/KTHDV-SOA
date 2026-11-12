import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import { AuthService } from './auth.service';

import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),

        signOptions: {
          expiresIn: '1h',
        },
      }),
    }),
  ],

  providers: [
    AuthService,
    JwtAuthGuard,
  ],

  exports: [
    AuthService,
    JwtAuthGuard,
  ],
})
export class AuthModule {}