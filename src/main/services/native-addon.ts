import type { ProcessPayload } from "./download/types";
import type { EpicProcessNode } from "./epic/managed-process-tracker";
import type {
  BuildLocalGameSnapshotInput,
  BuildLocalGameSnapshotPipelineInput,
  BuildSnapshotAggregateHashInput,
  DeleteLocalSaveTarget,
  DeleteLocalSaveTargetsResult,
  GameSaveRules,
  GetSaveRulesForGameInput,
  NativeLocalGameSnapshotPipelineResult,
  ReplaceRestoreTarget,
  ReplaceRestoreTargetsResult,
  ResolveRestoreTargetsInput,
  ResolveRestoreTargetsResult,
  ShouldSkipRestoreFileInput,
  VerifyDownloadedRestoreFileResult,
  CheckCloudSaveCustomPathOverlapInput,
  CheckCloudSaveCustomPathOverlapResult,
} from "@types";

type NativeProcessProfileImageResponse = {
  imagePath: string;
  image_path: string;
  mimeType?: string;
  mime_type?: string;
};

type NativeProcessSizedImageResponse = NativeProcessProfileImageResponse & {
  isAnimated?: boolean;
  is_animated?: boolean;
};

type NativeActiveWindowResponse = {
  windowId?: string;
  window_id?: string;
  processId?: number;
  process_id?: number;
};

export type NativeProcessPayload = ProcessPayload &
  Pick<
    EpicProcessNode,
    | "startTime"
    | "invocationId"
    | "winePrefixPath"
    | "peExecutablePath"
    | "inspectionComplete"
  >;

export type SystemProcessMap = {
  processMap: Record<string, string[]>;
  winePrefixMap: Record<string, string>;
  processTree?: EpicProcessNode[];
  linuxProcesses: Array<{
    name: string;
    cwd: string;
    exe: string;
    pid: number;
    appImagePath: string | null;
    steamCompatDataPath: string | null;
  }>;
};

export class NativeAddon {
  // Имитируем успешный ответ от торрент-клиента
  public static torrentInitialize(_port: number): Promise<void> {
    return Promise.resolve();
  }

  // Метод, который вызывает DownloadManager.getSeedStatus
  // Возвращаем пустую JSON-строку в виде массива "[]", чтобы .length не падал
  public static torrentRequest(
    _method: string,
    _paramsJson: string
  ): Promise<string> {
    return Promise.resolve("[]");
  }

  public static torrentShutdown(): Promise<void> {
    return Promise.resolve();
  }

  public static processProfileImage(
    imagePath: string,
    _targetExtension?: string
  ): NativeProcessProfileImageResponse {
    return { imagePath, image_path: imagePath };
  }

  public static async processImage(
    imagePath: string,
    _outputPathBase: string,
    _width: number,
    _height: number,
    _preserveAnimation: boolean
  ): Promise<NativeProcessSizedImageResponse> {
    return {
      imagePath,
      image_path: imagePath,
      isAnimated: false,
      is_animated: false,
    };
  }

  public static listProcesses(): NativeProcessPayload[] {
    return [];
  }

  public static async getSystemProcessMap(): Promise<SystemProcessMap | null> {
    return {
      processMap: {},
      winePrefixMap: {},
      linuxProcesses: [],
      processTree: [],
    };
  }

  public static getLinuxActiveWindow(): NativeActiveWindowResponse | null {
    return null;
  }

  public static async buildLocalGameSnapshotPipeline(
    _input: BuildLocalGameSnapshotPipelineInput
  ): Promise<NativeLocalGameSnapshotPipelineResult> {
    return { success: true } as unknown as NativeLocalGameSnapshotPipelineResult;
  }

  public static async buildLocalGameSnapshot(
    _input: BuildLocalGameSnapshotInput
  ): Promise<NativeLocalGameSnapshotPipelineResult> {
    return { success: true } as unknown as NativeLocalGameSnapshotPipelineResult;
  }

  public static async getSaveRulesForGame(
    _input: GetSaveRulesForGameInput
  ): Promise<GameSaveRules> {
    return {} as unknown as GameSaveRules;
  }

  public static buildSnapshotAggregateHash(
    _input: BuildSnapshotAggregateHashInput
  ): string {
    return "";
  }

  public static checkCloudSaveCustomPathOverlap(
    _input: CheckCloudSaveCustomPathOverlapInput
  ): CheckCloudSaveCustomPathOverlapResult {
    return { hasOverlap: false } as unknown as CheckCloudSaveCustomPathOverlapResult;
  }

  public static async uploadLocalSaveBlob(
    _absolutePath: string,
    _uploadUrl: string,
    _contentLength: string,
    _checksumSha256: string
  ): Promise<void> {
    return Promise.resolve();
  }

  public static async resolveRestoreTargets(
    _input: ResolveRestoreTargetsInput
  ): Promise<ResolveRestoreTargetsResult> {
    return {} as unknown as ResolveRestoreTargetsResult;
  }

  public static async downloadRestoreBlobToTemp(
    _snapshotId: string,
    _hash: string,
    _expectedSizeBytes: number,
    _downloadUrl: string,
    _tempRoot: string
  ): Promise<string> {
    return "";
  }

  public static async verifyDownloadedRestoreFile(
    _tempPath: string,
    _expectedHash: string
  ): Promise<VerifyDownloadedRestoreFileResult> {
    return {} as unknown as VerifyDownloadedRestoreFileResult;
  }

  public static async shouldSkipRestoreFile(
    _input: ShouldSkipRestoreFileInput
  ): Promise<boolean> {
    return false;
  }

  public static async replaceRestoreTargets(
    _files: ReplaceRestoreTarget[]
  ): Promise<ReplaceRestoreTargetsResult> {
    return {} as unknown as ReplaceRestoreTargetsResult;
  }

  public static async deleteLocalSaveTargets(
    _files: DeleteLocalSaveTarget[],
    _cleanupRootPaths?: string[]
  ): Promise<DeleteLocalSaveTargetsResult> {
    return {} as unknown as DeleteLocalSaveTargetsResult;
  }

  public static async cleanupRestoreTempSnapshot(
    _snapshotId: string,
    _tempRoot: string
  ): Promise<void> {
    return Promise.resolve();
  }
}
