type FlagValue = {
  id: string;
  value: boolean;
  roleName: string;
};

export type FlagDetailResponse = {
  flagId: string;
  flagName: string;
  isAdvanced: boolean;
  flagKey: string;
  flagValues: FlagValue[];
};

export type FlagStatusResponse = {
  flagKey: string;
  flagName: string;
  flagValue: boolean;
  metadata: {
    [key: string]: any;
  };
};

export type FlagStatusRequestPayload = {
  ec: string;
  s: string;
};

export type FlagOptions = {
  userId?: string;
  userRole?: string;
};
