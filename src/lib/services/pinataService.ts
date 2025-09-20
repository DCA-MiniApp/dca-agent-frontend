/**
 * Pinata IPFS Upload Service
 *
 * Service for uploading DCA scripts and metadata to IPFS using Pinata
 */

export interface PinataConfig {
  apiKey: string;
  secretApiKey: string;
}

export interface PinataUploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  pinataUrl?: string;
  error?: string;
}

export interface PinataMetadata {
  name?: string;
  keyvalues?: Record<string, string | number | boolean>;
}

/**
 * Pinata IPFS Service Class
 */
export class PinataService {
  private config: PinataConfig;
  private baseUrl = 'https://api.pinata.cloud';

  constructor(config?: PinataConfig) {
    // Use environment variables if config not provided
    this.config = config || {
      apiKey: process.env.NEXT_PUBLIC_PINATA_API_KEY || '',
      secretApiKey: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY || '',
    };

    if (!this.config.apiKey || !this.config.secretApiKey) {
      throw new Error('Pinata API credentials not found. Please set NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_API_KEY environment variables.');
    }
  }

  /**
   * Upload a file to IPFS via Pinata
   */
  async uploadFile(
    fileContent: string,
    fileName: string,
    metadata?: PinataMetadata
  ): Promise<PinataUploadResult> {
    try {
      console.log('📤 Uploading file to Pinata IPFS:', fileName);

      // Create FormData for the file upload
      const formData = new FormData();

      // Convert string content to Blob
      const blob = new Blob([fileContent], { type: 'application/javascript' });
      const file = new File([blob], fileName, { type: 'application/javascript' });

      formData.append('file', file);

      // Add metadata if provided
      if (metadata) {
        const pinataMetadata = {
          name: metadata.name || fileName,
          keyvalues: metadata.keyvalues || {},
        };
        formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
      }

      // Add options for pinning
      const pinataOptions = {
        cidVersion: 1,
        wrapWithDirectory: false,
      };
      formData.append('pinataOptions', JSON.stringify(pinataOptions));

      // Make the upload request
      const response = await fetch(`${this.baseUrl}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'pinata_api_key': this.config.apiKey,
          'pinata_secret_api_key': this.config.secretApiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Pinata upload failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ File uploaded to Pinata:', result);

      return {
        success: true,
        ipfsHash: result.IpfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      };

    } catch (error) {
      console.error('❌ Pinata upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadJSON(
    jsonData: Record<string, any>,
    metadata?: PinataMetadata
  ): Promise<PinataUploadResult> {
    try {
      console.log('📤 Uploading JSON to Pinata IPFS');

      const jsonString = JSON.stringify(jsonData, null, 2);

      const requestBody = {
        pinataContent: jsonData,
        pinataMetadata: metadata ? {
          name: metadata.name || 'dca-metadata.json',
          keyvalues: metadata.keyvalues || {},
        } : undefined,
        pinataOptions: {
          cidVersion: 1,
        },
      };

      const response = await fetch(`${this.baseUrl}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.config.apiKey,
          'pinata_secret_api_key': this.config.secretApiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Pinata JSON upload failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ JSON uploaded to Pinata:', result);

      return {
        success: true,
        ipfsHash: result.IpfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      };

    } catch (error) {
      console.error('❌ Pinata JSON upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown JSON upload error',
      };
    }
  }

  /**
   * Upload both script and metadata to IPFS
   */
  async uploadDCAScriptAndMetadata(
    scriptContent: string,
    scriptName: string,
    metadata: Record<string, any>
  ): Promise<{
    scriptResult: PinataUploadResult;
    metadataResult: PinataUploadResult;
  }> {
    try {
      console.log('📤 Uploading DCA script and metadata to IPFS');

      // Upload script first
      const scriptResult = await this.uploadFile(scriptContent, scriptName, {
        name: scriptName,
        keyvalues: {
          type: 'dca-script',
          planId: metadata.planId,
          uploadedAt: new Date().toISOString(),
        },
      });

      if (!scriptResult.success) {
        throw new Error(`Script upload failed: ${scriptResult.error}`);
      }

      // Add script IPFS hash to metadata
      const enhancedMetadata = {
        ...metadata,
        scriptIpfsHash: scriptResult.ipfsHash,
        scriptIpfsUrl: scriptResult.ipfsUrl,
      };

      // Upload metadata
      const metadataResult = await this.uploadJSON(enhancedMetadata, {
        name: `${scriptName}-metadata.json`,
        keyvalues: {
          type: 'dca-metadata',
          planId: metadata.planId,
          uploadedAt: new Date().toISOString(),
        },
      });

      return {
        scriptResult,
        metadataResult,
      };

    } catch (error) {
      console.error('❌ DCA upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';

      return {
        scriptResult: { success: false, error: errorMessage },
        metadataResult: { success: false, error: errorMessage },
      };
    }
  }

  /**
   * Get file content from IPFS
   */
  async getFile(ipfsHash: string): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
      }

      const content = await response.text();

      return {
        success: true,
        content,
      };

    } catch (error) {
      console.error('❌ IPFS fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown fetch error',
      };
    }
  }

  /**
   * Check if Pinata service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.secretApiKey);
  }

  /**
   * Get Pinata configuration status
   */
  getConfigStatus(): { configured: boolean; hasApiKey: boolean; hasSecretKey: boolean } {
    return {
      configured: this.isConfigured(),
      hasApiKey: !!this.config.apiKey,
      hasSecretKey: !!this.config.secretApiKey,
    };
  }
}

// Export singleton instance
let pinataInstance: PinataService | null = null;

export function getPinataService(): PinataService {
  if (!pinataInstance) {
    pinataInstance = new PinataService();
  }
  return pinataInstance;
}

// Utility function to create DCA script and upload to IPFS
export async function uploadDCAScriptToIPFS(
  scriptParams: any,
  scriptGenerator: (params: any) => string,
  metadataGenerator: (params: any) => Record<string, any>
): Promise<{
  success: boolean;
  scriptIpfsUrl?: string;
  metadataIpfsUrl?: string;
  scriptIpfsHash?: string;
  metadataIpfsHash?: string;
  error?: string;
}> {
  try {
    const pinata = getPinataService();

    if (!pinata.isConfigured()) {
      throw new Error('Pinata service is not properly configured');
    }

    // Generate script and metadata
    const scriptContent = scriptGenerator(scriptParams);
    const metadata = metadataGenerator(scriptParams);
    const scriptName = `dca-job-${scriptParams.planId}.js`;

    // Upload both to IPFS
    const uploadResult = await pinata.uploadDCAScriptAndMetadata(
      scriptContent,
      scriptName,
      metadata
    );

    if (!uploadResult.scriptResult.success) {
      throw new Error(`Script upload failed: ${uploadResult.scriptResult.error}`);
    }

    return {
      success: true,
      scriptIpfsUrl: uploadResult.scriptResult.ipfsUrl,
      metadataIpfsUrl: uploadResult.metadataResult.success ? uploadResult.metadataResult.ipfsUrl : undefined,
      scriptIpfsHash: uploadResult.scriptResult.ipfsHash,
      metadataIpfsHash: uploadResult.metadataResult.success ? uploadResult.metadataResult.ipfsHash : undefined,
    };

  } catch (error) {
    console.error('❌ DCA script upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}
