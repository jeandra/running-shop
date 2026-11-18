import { IsObject, IsOptional, IsString } from 'class-validator';

export class MidtransWebhookDto {
  @IsString()
  event_id!: string;

  @IsOptional()
  @IsObject()
  transaction?: { status?: string };

  @IsOptional()
  @IsString()
  order_id?: string;
}
