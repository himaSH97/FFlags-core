import * as forge from "node-forge";
import {
  FlagStatusResponse,
  FlagOptions,
  FlagStatusRequestPayload,
  FlagDetailResponse,
  FlexFlagConfig,
} from "./types";
import "dotenv/config";

export class FFlagClient {
  private secretKey: string;
  private publicKey: string;
  private projectKey: string;
  // private BACKEND_URL = "http://localhost:4000";
  private BACKEND_URL = "https://fflagsbackend-x94aak4f.b4a.run";

  constructor(config: FlexFlagConfig) {
    if (!config.secretKey) {
      throw new Error("Secret key should not be empty");
    }
    if (!config.publicKey) {
      throw new Error("Public key should not be empty");
    }
    if (!config.projectKey) {
      throw new Error("Project key should not be empty");
    }
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
    this.projectKey = config.projectKey;
  }

  private encryptdata(data: any): any {
    const secretKeyPem = forge.util.decode64(this.secretKey);
    const publicKeyPem = forge.util.decode64(this.publicKey);
    const projectId = forge.util.decode64(this.projectKey);

    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const secretKey = forge.pki.privateKeyFromPem(secretKeyPem);

    const content = JSON.stringify(data);
    const encryptedContent = publicKey.encrypt(
      forge.util.encodeUtf8(content),
      "RSA-OAEP",
      {
        md: forge.md.sha256.create(),
      }
    );

    const signature = secretKey.sign(
      forge.md.sha256.create().update(encryptedContent, "utf8")
    );

    return {
      ec: forge.util.encode64(encryptedContent),
      s: forge.util.encode64(signature),
    };
  }

  public async getFlag(
    flagNames: string[],
    options: FlagOptions = {}
  ): Promise<any> {
    if (!flagNames || flagNames.length === 0) {
      throw new Error("Flag name is required");
    }

    const data = {
      userId: options.userId,
      userRole: options.userRole,
      flagKeys: flagNames,
      projectKey: this.projectKey,
    };

    const encrypted = this.encryptdata(data);

    const flagInfo = await this.fetchFlagInfo(encrypted);
    const formatedResponse = this.formatResponses(flagInfo);

    return formatedResponse;
  }

  private formatResponse(data: FlagDetailResponse): FlagStatusResponse {
    return {
      flagName: data.flagName,
      flagKey: data.flagKey,
      flagValue: data.flagValues[0].value,
      metadata: {
        role: data.flagValues[0].roleName,
      },
    };
  }

  private formatResponses(dataArray: FlagDetailResponse[]): {
    [key: string]: FlagStatusResponse;
  } {
    return dataArray.reduce((acc, data) => {
      const formattedResponse = this.formatResponse(data);
      acc[formattedResponse.flagKey] = formattedResponse;
      return acc;
    }, {} as { [key: string]: FlagStatusResponse });
  }

  private async fetchFlagInfo(data: FlagStatusRequestPayload) {
    try {
      const res = await fetch(`${this.BACKEND_URL}/api/client/flag-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fflags-project-key": this.projectKey,
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message);
      }

      return resData;
    } catch (error) {
      throw error;
    }
  }
}

// async function main() {
//   const fflagClient = new FFlagClient(process.env.SECRET_KEY as string, process.env.PUBLIC_KEY as string, process.env.PROJECT_KEY as string);
//   const test: any = await fflagClient.getFlag(["BETA_BANNER"], {});
//   console.log("🚀 ~ main ~ test:", test);
// }
// main();
