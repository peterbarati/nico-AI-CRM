export interface Campaign {
  id: string;
  name: string;
  campaignType: string;
  status: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCampaign {
  id: string;
  campaignId: string;
  customerId: string;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  convertedAt: string | null;
  conversionOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}
