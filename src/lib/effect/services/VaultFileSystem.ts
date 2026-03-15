import { BunServices } from "@effect/platform-bun";
import { Effect, Layer, Schema, ServiceMap } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

export class FileOperationError extends Schema.TaggedErrorClass<FileOperationError>()(
	"FileOperationError",
	{
		operation: Schema.String,
		path: Schema.String,
		cause: Schema.String,
		code: Schema.optional(Schema.String),
	},
) {}

export type VaultPathInfo = {
	type: string;
};

type ReadDirectoryOptions = {
	readonly recursive?: boolean;
};

type MakeDirectoryOptions = {
	readonly recursive?: boolean;
};

type RemoveOptions = {
	readonly recursive?: boolean;
	readonly force?: boolean;
};

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

function getErrorCode(error: unknown): string | undefined {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "string"
	) {
		return error.code;
	}

	return undefined;
}

function toFileOperationError({
	operation,
	filePath,
	error,
}: {
	operation: string;
	filePath: string;
	error: unknown;
}): FileOperationError {
	return new FileOperationError({
		operation,
		path: filePath,
		cause: getErrorMessage(error),
		code: getErrorCode(error),
	});
}

/**
 * Wraps path and filesystem operations behind a small Effect service surface so
 * scripts can share consistent file-system behavior and error mapping.
 */
export class VaultFileSystem extends ServiceMap.Service<
	VaultFileSystem,
	{
		resolveFromCwd(pathLike: string): string;
		join(...paths: ReadonlyArray<string>): string;
		dirname(pathLike: string): string;
		basename(pathLike: string, suffix?: string): string;
		extname(pathLike: string): string;
		relative(from: string, to: string): string;
		normalize(pathLike: string): string;
		pathSeparator: string;
		exists(pathLike: string): Effect.Effect<boolean, FileOperationError>;
		statOptional(
			pathLike: string,
		): Effect.Effect<VaultPathInfo | null, FileOperationError>;
		readDirectory(
			pathLike: string,
			options?: ReadDirectoryOptions,
		): Effect.Effect<Array<string>, FileOperationError>;
		readFileString(pathLike: string): Effect.Effect<string, FileOperationError>;
		writeFileString(
			pathLike: string,
			contents: string,
		): Effect.Effect<void, FileOperationError>;
		copyFile(
			sourcePath: string,
			destinationPath: string,
		): Effect.Effect<void, FileOperationError>;
		makeDirectory(
			pathLike: string,
			options?: MakeDirectoryOptions,
		): Effect.Effect<void, FileOperationError>;
		remove(
			pathLike: string,
			options?: RemoveOptions,
		): Effect.Effect<void, FileOperationError>;
		utimes(
			pathLike: string,
			atime: Date,
			mtime: Date,
		): Effect.Effect<void, FileOperationError>;
	}
>()("vault/effect/services/VaultFileSystem") {
	static readonly layer = Layer.effect(
		VaultFileSystem,
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;

			const exists = Effect.fn("VaultFileSystem.exists")(function* (
				pathLike: string,
			) {
				return yield* fs.exists(pathLike).pipe(
					Effect.mapError((error) =>
						toFileOperationError({
							operation: "exists",
							filePath: pathLike,
							error,
						}),
					),
				);
			});

			const statOptional = Effect.fn("VaultFileSystem.statOptional")(function* (
				pathLike: string,
			) {
				const pathExists = yield* exists(pathLike);
				if (!pathExists) {
					return null;
				}

				return yield* fs.stat(pathLike).pipe(
					Effect.mapError((error) =>
						toFileOperationError({
							operation: "stat",
							filePath: pathLike,
							error,
						}),
					),
				);
			});

			const readDirectory = Effect.fn("VaultFileSystem.readDirectory")(
				function* (pathLike: string, options?: ReadDirectoryOptions) {
					return yield* fs.readDirectory(pathLike, options).pipe(
						Effect.mapError((error) =>
							toFileOperationError({
								operation: "read-directory",
								filePath: pathLike,
								error,
							}),
						),
					);
				},
			);

			const readFileString = Effect.fn("VaultFileSystem.readFileString")(
				function* (pathLike: string) {
					return yield* fs.readFileString(pathLike).pipe(
						Effect.mapError((error) =>
							toFileOperationError({
								operation: "read-file",
								filePath: pathLike,
								error,
							}),
						),
					);
				},
			);

			const writeFileString = Effect.fn("VaultFileSystem.writeFileString")(
				function* (pathLike: string, contents: string) {
					return yield* fs.writeFileString(pathLike, contents).pipe(
						Effect.mapError((error) =>
							toFileOperationError({
								operation: "write-file",
								filePath: pathLike,
								error,
							}),
						),
					);
				},
			);

			const copyFile = Effect.fn("VaultFileSystem.copyFile")(function* (
				sourcePath: string,
				destinationPath: string,
			) {
				return yield* fs.copyFile(sourcePath, destinationPath).pipe(
					Effect.mapError((error) =>
						toFileOperationError({
							operation: "copy-file",
							filePath: `${sourcePath} -> ${destinationPath}`,
							error,
						}),
					),
				);
			});

			const makeDirectory = Effect.fn("VaultFileSystem.makeDirectory")(
				function* (pathLike: string, options?: MakeDirectoryOptions) {
					return yield* fs.makeDirectory(pathLike, options).pipe(
						Effect.mapError((error) =>
							toFileOperationError({
								operation: "make-directory",
								filePath: pathLike,
								error,
							}),
						),
					);
				},
			);

			const remove = Effect.fn("VaultFileSystem.remove")(function* (
				pathLike: string,
				options?: RemoveOptions,
			) {
				return yield* fs.remove(pathLike, options).pipe(
					Effect.mapError((error) =>
						toFileOperationError({
							operation: "remove",
							filePath: pathLike,
							error,
						}),
					),
				);
			});

			const utimes = Effect.fn("VaultFileSystem.utimes")(function* (
				pathLike: string,
				atime: Date,
				mtime: Date,
			) {
				return yield* fs.utimes(pathLike, atime, mtime).pipe(
					Effect.mapError((error) =>
						toFileOperationError({
							operation: "utimes",
							filePath: pathLike,
							error,
						}),
					),
				);
			});

			return VaultFileSystem.of({
				resolveFromCwd: (pathLike) => path.resolve(process.cwd(), pathLike),
				join: (...paths) => path.join(...paths),
				dirname: (pathLike) => path.dirname(pathLike),
				basename: (pathLike, suffix) => path.basename(pathLike, suffix),
				extname: (pathLike) => path.extname(pathLike),
				relative: (from, to) => path.relative(from, to),
				normalize: (pathLike) => path.normalize(pathLike),
				pathSeparator: path.sep,
				exists,
				statOptional,
				readDirectory,
				readFileString,
				writeFileString,
				copyFile,
				makeDirectory,
				remove,
				utimes,
			});
		}),
	).pipe(Layer.provide(BunServices.layer));
}
