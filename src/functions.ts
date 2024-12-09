import * as forge from "node-forge";
import {
  FlagStatusResponse,
  FlagOptions,
  FlagStatusRequestPayload,
  FlagDetailResponse,
} from "./types";
import "dotenv/config";

export class FFlagClient {
  private secretKey: string;
  private publicKey: string;
  private projectKey: string;
  private BACKEND_URL = "http://localhost:4000";

  constructor(secretKey: string, publicKey: string, projectKey: string) {
    if (!secretKey) {
      throw new Error("Secret key should not be empty");
    }
    if (!publicKey) {
      throw new Error("Public key should not be empty");
    }
    if (!projectKey) {
      throw new Error("Project key should not be empty");
    }
    this.secretKey = secretKey;
    this.publicKey = publicKey;
    this.projectKey = projectKey;
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
    flagName: string,
    options: FlagOptions = {}
  ): Promise<any> {
    if (!flagName) {
      throw new Error("Flag name is required");
    }

    const data = {
      userId: options.userId,
      userRole: options.userRole,
      flagName,
      projectKey: this.projectKey,
    };

    const encrypted = this.encryptdata(data);

    const flagInfo = await this.fetchFlagInfo(encrypted);
    const formatedResponse = this.formatResponse(flagInfo[0]);

    return formatedResponse;
  }

  private formatResponse(data: FlagDetailResponse): FlagStatusResponse {
    return {
      flagName: data.flagName,
      flagKey: data.flagKey,
      flagValue: data.flagValues[0].value,
    };
  }

  private async fetchFlagInfo(data: FlagStatusRequestPayload) {
    const res = await fetch(`${this.BACKEND_URL}/api/client/flag-info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-fflags-project-key": this.projectKey,
      },
      body: JSON.stringify(data),
    });

    return await res.json();
  }
}

async function main() {
  const fflagClient = new FFlagClient(
    process.env.SECRET_KEY as string,
    process.env.PUBLIC_KEY as string,
    process.env.PROJECT_KEY as string
  );
  const test: any = await fflagClient.getFlag("FIRST", {});
}
main();
