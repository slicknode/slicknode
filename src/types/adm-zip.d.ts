// Type definitions for adm-zip v0.4.4
// Project: https://github.com/cthackers/adm-zip
// Definitions by: John Vilk <https://github.com/jvilk>, Abner Oliveira <https://github.com/abner>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
/* tslint:disable */

/// <reference types="node" />

declare class AdmZip {
  /**
   * Create a new, empty archive.
   */
  constructor();
  /**
   * Read an existing archive.
   */
  constructor(fileName: string);
  constructor(rawData: Buffer);
  /**
   * Extracts the given entry from the archive and returns the content as a
   * Buffer object.
   * @param entry String with the full path of the entry
   * @return Buffer or Null in case of error
   */
  public readFile(entry: string): Buffer;
  /**
   * Extracts the given entry from the archive and returns the content as a
   * Buffer object.
   * @param entry ZipEntry object
   * @return Buffer or Null in case of error
   */
  public readFile(entry: AdmZip.IZipEntry): Buffer;
  /**
   * Asynchronous readFile
   * @param entry String with the full path of the entry
   * @param callback Called with a Buffer or Null in case of error
   */
  public readFileAsync(
    entry: string,
    callback: (data: Buffer, err: string) => any
  ): void;
  /**
   * Asynchronous readFile
   * @param entry ZipEntry object
   * @param callback Called with a Buffer or Null in case of error
   * @return Buffer or Null in case of error
   */
  public readFileAsync(
    entry: AdmZip.IZipEntry,
    callback: (data: Buffer, err: string) => any
  ): void;
  /**
   * Extracts the given entry from the archive and returns the content as
   * plain text in the given encoding
   * @param entry String with the full path of the entry
   * @param encoding Optional. If no encoding is specified utf8 is used
   * @return String
   */
  public readAsText(fileName: string, encoding?: string): string;
  /**
   * Extracts the given entry from the archive and returns the content as
   * plain text in the given encoding
   * @param entry ZipEntry object
   * @param encoding Optional. If no encoding is specified utf8 is used
   * @return String
   */
  public readAsText(fileName: AdmZip.IZipEntry, encoding?: string): string;
  /**
   * Asynchronous readAsText
   * @param entry String with the full path of the entry
   * @param callback Called with the resulting string.
   * @param encoding Optional. If no encoding is specified utf8 is used
   */
  public readAsTextAsync(
    fileName: string,
    callback: (data: string) => any,
    encoding?: string
  ): void;
  /**
   * Asynchronous readAsText
   * @param entry ZipEntry object
   * @param callback Called with the resulting string.
   * @param encoding Optional. If no encoding is specified utf8 is used
   */
  public readAsTextAsync(
    fileName: AdmZip.IZipEntry,
    callback: (data: string) => any,
    encoding?: string
  ): void;
  /**
   * Remove the entry from the file or the entry and all its nested directories
   * and files if the given entry is a directory
   * @param entry String with the full path of the entry
   */
  public deleteFile(entry: string): void;
  /**
   * Remove the entry from the file or the entry and all its nested directories
   * and files if the given entry is a directory
   * @param entry A ZipEntry object.
   */
  public deleteFile(entry: AdmZip.IZipEntry): void;
  /**
   * Adds a comment to the zip. The zip must be rewritten after
   * adding the comment.
   * @param comment Content of the comment.
   */
  public addZipComment(comment: string): void;
  /**
   * Returns the zip comment
   * @return The zip comment.
   */
  public getZipComment(): string;
  /**
   * Adds a comment to a specified zipEntry. The zip must be rewritten after
   * adding the comment.
   * The comment cannot exceed 65535 characters in length.
   * @param entry String with the full path of the entry
   * @param comment The comment to add to the entry.
   */
  public addZipEntryComment(entry: string, comment: string): void;
  /**
   * Adds a comment to a specified zipEntry. The zip must be rewritten after
   * adding the comment.
   * The comment cannot exceed 65535 characters in length.
   * @param entry ZipEntry object.
   * @param comment The comment to add to the entry.
   */
  public addZipEntryComment(entry: AdmZip.IZipEntry, comment: string): void;
  /**
   * Returns the comment of the specified entry.
   * @param entry String with the full path of the entry.
   * @return String The comment of the specified entry.
   */
  public getZipEntryComment(entry: string): string;
  /**
   * Returns the comment of the specified entry
   * @param entry ZipEntry object.
   * @return String The comment of the specified entry.
   */
  public getZipEntryComment(entry: AdmZip.IZipEntry): string;
  /**
   * Updates the content of an existing entry inside the archive. The zip
   * must be rewritten after updating the content
   * @param entry String with the full path of the entry.
   * @param content The entry's new contents.
   */
  public updateFile(entry: string, content: Buffer): void;
  /**
   * Updates the content of an existing entry inside the archive. The zip
   * must be rewritten after updating the content
   * @param entry ZipEntry object.
   * @param content The entry's new contents.
   */
  public updateFile(entry: AdmZip.IZipEntry, content: Buffer): void;
  /**
   * Adds a file from the disk to the archive.
   * @param localPath Path to a file on disk.
   * @param zipPath Path to a directory in the archive. Defaults to the empty
   *   string.
   */
  public addLocalFile(localPath: string, zipPath?: string): void;
  /**
   * Adds a local directory and all its nested files and directories to the
   * archive.
   * @param localPath Path to a folder on disk.
   * @param zipPath Path to a folder in the archive. Defaults to an empty
   *   string.
   */
  public addLocalFolder(localPath: string, zipPath?: string): void;
  /**
   * Allows you to create a entry (file or directory) in the zip file.
   * If you want to create a directory the entryName must end in / and a null
   * buffer should be provided.
   * @param entryName Entry path
   * @param content Content to add to the entry; must be a 0-length buffer
   *   for a directory.
   * @param comment Comment to add to the entry.
   * @param attr Attribute to add to the entry.
   */
  public addFile(
    entryName: string,
    data: Buffer,
    comment?: string,
    attr?: number
  ): void;
  /**
   * Returns an array of ZipEntry objects representing the files and folders
   * inside the archive
   */
  public getEntries(): AdmZip.IZipEntry[];
  /**
   * Returns a ZipEntry object representing the file or folder specified by
   * ``name``.
   * @param name Name of the file or folder to retrieve.
   * @return ZipEntry The entry corresponding to the name.
   */
  public getEntry(name: string): AdmZip.IZipEntry;
  /**
   * Extracts the given entry to the given targetPath.
   * If the entry is a directory inside the archive, the entire directory and
   * its subdirectories will be extracted.
   * @param entry String with the full path of the entry
   * @param targetPath Target folder where to write the file
   * @param maintainEntryPath If maintainEntryPath is true and the entry is
   *   inside a folder, the entry folder will be created in targetPath as
   *   well. Default is TRUE
   * @param overwrite If the file already exists at the target path, the file
   *   will be overwriten if this is true. Default is FALSE
   *
   * @return Boolean
   */
  public extractEntryTo(
    entryPath: string,
    targetPath: string,
    maintainEntryPath?: boolean,
    overwrite?: boolean
  ): boolean;
  /**
   * Extracts the given entry to the given targetPath.
   * If the entry is a directory inside the archive, the entire directory and
   * its subdirectories will be extracted.
   * @param entry ZipEntry object
   * @param targetPath Target folder where to write the file
   * @param maintainEntryPath If maintainEntryPath is true and the entry is
   *   inside a folder, the entry folder will be created in targetPath as
   *   well. Default is TRUE
   * @param overwrite If the file already exists at the target path, the file
   *   will be overwriten if this is true. Default is FALSE
   * @return Boolean
   */
  public extractEntryTo(
    entryPath: AdmZip.IZipEntry,
    targetPath: string,
    maintainEntryPath?: boolean,
    overwrite?: boolean
  ): boolean;
  /**
   * Extracts the entire archive to the given location
   * @param targetPath Target location
   * @param overwrite If the file already exists at the target path, the file
   *   will be overwriten if this is true. Default is FALSE
   */
  public extractAllTo(targetPath: string, overwrite?: boolean): void;
  /**
   * Extracts the entire archive to the given location
   * @param targetPath Target location
   * @param overwrite If the file already exists at the target path, the file
   *   will be overwriten if this is true. Default is FALSE
   * @param callback The callback function will be called afeter extraction
   */
  public extractAllToAsync(
    targetPath: string,
    overwrite: boolean,
    callback: (error: Error) => void
  ): void;
  /**
   * Writes the newly created zip file to disk at the specified location or
   * if a zip was opened and no ``targetFileName`` is provided, it will
   * overwrite the opened zip
   * @param targetFileName
   */
  public writeZip(targetPath?: string): void;
  /**
   * Returns the content of the entire zip file as a Buffer object
   * @return Buffer
   */
  public toBuffer(
    onSuccess?: (buffer: Buffer) => void,
    onFailure?: (error: Error) => void
  ): Buffer;
}

declare namespace AdmZip {
  /**
   * The ZipEntry is more than a structure representing the entry inside the
   * zip file. Beside the normal attributes and headers a entry can have, the
   * class contains a reference to the part of the file where the compressed
   * data resides and decompresses it when requested. It also compresses the
   * data and creates the headers required to write in the zip file.
   */
  interface IZipEntry {
    /**
     * Represents the full name and path of the file
     */
    entryName: string;
    rawEntryName: Buffer;
    /**
     * Extra data associated with this entry.
     */
    extra: Buffer;
    /**
     * Entry comment.
     */
    comment: string;
    name: string;
    /**
     * Read-Only property that indicates the type of the entry.
     */
    isDirectory: boolean;
    /**
     * Get the header associated with this ZipEntry.
     */
    header: Buffer;
    /**
     * Retrieve the compressed data for this entry. Note that this may trigger
     * compression if any properties were modified.
     */
    getCompressedData(): Buffer;
    /**
     * Asynchronously retrieve the compressed data for this entry. Note that
     * this may trigger compression if any properties were modified.
     */
    getCompressedDataAsync(callback: (data: Buffer) => void): void;
    /**
     * Set the (uncompressed) data to be associated with this entry.
     */
    setData(value: string): void;
    /**
     * Set the (uncompressed) data to be associated with this entry.
     */
    setData(value: Buffer): void;
    /**
     * Get the decompressed data associated with this entry.
     */
    getData(): Buffer;
    /**
     * Asynchronously get the decompressed data associated with this entry.
     */
    getDataAsync(callback: (data: Buffer) => void): void;
    /**
     * Returns the CEN Entry Header to be written to the output zip file, plus
     * the extra data and the entry comment.
     */
    packHeader(): Buffer;
    /**
     * Returns a nicely formatted string with the most important properties of
     * the ZipEntry.
     */
    toString(): string;
  }
}

export = AdmZip;
