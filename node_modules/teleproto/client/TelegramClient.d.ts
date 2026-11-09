import { TelegramBaseClient, TelegramClientParams } from "./TelegramBaseClient";
import type { DcAddress } from "../network/dc/DcAddressBook";
import * as authMethods from "./methods/auth";
import * as botMethods from "./methods/bots";
import * as downloadMethods from "./methods/downloads";
import * as parseMethods from "./methods/messageParse";
import * as messageMethods from "./methods/messages";
import * as uploadMethods from "./methods/uploads";
import * as userMethods from "./methods/users";
import * as chatMethods from "./methods/chats";
import * as communityMethods from "./methods/communities";
import * as inviteLinkMethods from "./methods/inviteLinks";
import * as accountMethods from "./methods/account";
import * as contactMethods from "./methods/contacts";
import * as dialogMethods from "./methods/dialogs";
import * as twoFA from "./methods/2fa";
import * as forumMethods from "./methods/forums";
import * as storyMethods from "./methods/stories";
import * as stickerMethods from "./methods/stickers";
import * as walletMethods from "./methods/wallet";
import type { BigInteger } from "big-integer";
import type { MarkupLike, Entity, EntityLike, FileLike, MessageIDLike } from "../define";
import { Api } from "../tl";
import type { EventBuilder } from "../events/common";
import { MTProtoSender } from "../network";
import type { SessionLease } from "../network/dc/SessionPool";
import { DownloadMediaInterface } from "./methods/downloads";
import { NewMessage, NewMessageEvent } from "../events";
import { ClientUpdates } from "./updates/ClientUpdates";
import { Session } from "../sessions";
import { Album, AlbumEvent } from "../events/Album";
import { CallbackQuery, CallbackQueryEvent } from "../events/CallbackQuery";
import { EditedMessage, EditedMessageEvent } from "../events/EditedMessage";
import { DeletedMessage, DeletedMessageEvent } from "../events/DeletedMessage";
/**
 * The TelegramClient uses several methods in different files to provide all the common functionality in a nice interface.</br>
 * **In short, to create a client you must do:**
 *
 * ```ts
 * import {TelegramClient} from "teleproto";
 *
 * const client = new TelegramClient(new StringSession(''),apiId,apiHash,{});
 * ```
 *
 * You don't need to import any methods that are inside the TelegramClient class as they binding in it.
 */
export declare class TelegramClient<S extends Session = Session> extends TelegramBaseClient<S> {
    private _connectTask?;
    /**
     * The update pipeline: middleware, typed subscriptions and live
     * subscriptions to chats. See {@link ClientUpdates}.
     *
     * @example
     * ```ts
     * client.updates.on("newChannelMessage", (update) => console.log(update.message.id));
     * client.updates.watch("obitoscasino", (update) => console.log(update.message.id));
     * ```
     * @category Updates
     */
    get updates(): ClientUpdates;
    /**
     * @param session - a session to be used to save the connection and auth key to. This can be a custom session that inherits MemorySession.
     * @param apiId - The API ID you obtained from https://my.telegram.org.
     * @param apiHash - The API hash you obtained from https://my.telegram.org.
     * @param clientParams - see {@link TelegramClientParams}
     */
    constructor(session: string | S, apiId: number, apiHash: string, clientParams: TelegramClientParams);
    /**
     * Used to handle all aspects of connecting to telegram.<br/>
     * This method will connect to the telegram servers and check if the user is already logged in.<br/>
     * in the case of a new connection this will sign in if the phone already exists or sign up otherwise<br/>
     * By using this method you are **agreeing to Telegram's Terms of Service** https://core.telegram.org/api/terms.<br/>
     * this method also calls {@link getMe} to tell telegram that we want to receive updates.<br/>
     * @param authParams - see UserAuthParams and BotAuthParams
     * @return nothing
     * @example
     * ```ts
     * // this example assumes you've installed and imported the input package. npm i input.
     * // This package uses CLI to receive input from the user. you can use your own callback function.
     * import { TelegramClient } from "teleproto";
     * import { StringSession } from "teleproto/sessions";
     *
     * const client = new TelegramClient(new StringSession(''), apiId, apiHash, {});
     * // logging in as a bot account
     * await client.start(botToken="123456:abcdfgh123456789);
     * // logging in as a user account
     * await client.start({
     *   phoneNumber: async () => await input.text("number ?"),
     *   password: async () => await input.text("password?"),
     *   phoneCode: async () => await input.text("Code ?"),
     *   onError: (err) => console.log(err),
     * });
     * >Number ? +1234567897
     * >Code ? 12345
     * >password ? 111111
     * Logged in as user...
     *
     * You can now use the client instance to call other api requests.
     * @category Authorization
     */
    start(authParams?: authMethods.UserAuthParams | authMethods.BotAuthParams): Promise<void>;
    /**
     * Checks whether the current client is authorized or not. (logged in as a user)
     * @example
     * ```ts
     * await client.connect();
     * if (await client.checkAuthorization()){
     *     console.log("I am logged in!");
     * }else{
     *     console.log("I am connected to telegram servers but not logged in with any account/bot");
     * }
     * ```
     * @return boolean (true of authorized else false)
     * @category Authorization
     */
    checkAuthorization(): Promise<boolean>;
    /**
     * Logs out the currently authenticated user/bot. Invalidates the session
     * on Telegram's side (via `auth.LogOut`), disconnects the client and wipes
     * local session data so a subsequent `session.save()` returns nothing.
     *
     * After this call the client is disconnected and event handlers stop
     * firing; reconnecting requires going through `start`/`signInUser` again.
     *
     * @returns `true` if the server-side log out succeeded, `false` if the
     * `auth.LogOut` call failed. Local session data is wiped in both cases.
     * @example
     * ```ts
     * await client.logOut();
     * ```
     * @category Authorization
     */
    logOut(): Promise<boolean>;
    /**
     * Logs in as a user. Should only be used when not already logged in.<br/>
     * This method will send a code when needed.<br/>
     * This will also sign up if needed.
     * @example
     * ```ts
     * await client.connect();
     * // we should only use this when we are not already authorized.
     * // This function is very similar to `client.start`
     * // The minor difference that start checks if already authorized and supports bots as well.
     * if (!await client.checkAuthorization()){
     *     const phoneNumber = "+123456789";
     *     await client.signIn({
     *         apiId:132456,
     *         apiHash:"132456",
     *     },{
     *     phoneNumber: async () => await input.text("number ?"),
     *     password: async () => await input.text("password?"),
     *     phoneCode: async () => await input.text("Code ?"),
     *     onError: (err) => console.log(err),
     *     })
     *  }
     * ```
     * @param apiCredentials - credentials to be used.
     * @param authParams - user auth params.
     * @category Authorization
     */
    signInUser(apiCredentials: authMethods.ApiCredentials, authParams: authMethods.UserAuthParams): Promise<Api.TypeUser>;
    /**
     * logs the user using a QR code to be scanned.<br/>
     * this function generates the QR code that needs to be scanned by mobile.
     *
     * The flow can be cancelled at any time (e.g. the user closed the page) by
     * passing an `abortSignal`; once aborted it stops polling for tokens and
     * rejects with an `AbortError`.
     * @example
     * '''ts
     * await client.connect();
     * const controller = new AbortController();
     * // call controller.abort() to cancel the QR login at any time
     * try {
     *   const user = await client.signInUserWithQrCode({ apiId, apiHash },
     *   {
     *       onError: async function(p1: Error) {
     *           console.log("error", p1);
     *           // true = stop the authentication processes
     *           return true;
     *       },
     *       qrCode: async (code) => {
     *           console.log("Convert the next string to a QR code and scan it");
     *           console.log(
     *               `tg://login?token=${code.token.toString("base64url")}`
     *           );
     *       },
     *       password: async (hint) => {
     *           // password if needed
     *           return "1111";
     *       },
     *       abortSignal: controller.signal,
     *   }
     *   );
     *   console.log("user is", user);
     * } catch (err) {
     *   if (err.name === "AbortError") console.log("QR login cancelled");
     *   else throw err;
     * }
     *
     * '''
     * @param apiCredentials - credentials to be used.
     * @param authParams - user auth params. Pass `abortSignal` to cancel the flow.
     * @category Authorization
     */
    signInUserWithQrCode(apiCredentials: authMethods.ApiCredentials, authParams: authMethods.QrCodeAuthParams): Promise<Api.TypeUser>;
    /**
     * Sends a telegram authentication code to the phone number.
     * @example
     * ```ts
     * await client.connect();
     * const {phoneCodeHash,isCodeViaApp} = await client.sendCode({
     *     apiId:1234,
     *     apiHash:"123456789abcfghj",
     * },"+123456798"});
     * ```
     * @param apiCredentials - credentials to be used.
     * @param phoneNumber - the phone number to send the code to
     * @param forceSMS - whether to send it as an SMS or a normal in app message
     * @param reCaptchaCallback - callback to handle reCAPTCHA verification
     * @return the phone code hash and whether it was sent via app
     * @category Authorization
     */
    sendCode(apiCredentials: authMethods.ApiCredentials, phoneNumber: string, forceSMS?: boolean, reCaptchaCallback?: (siteKey: string) => Promise<string>): Promise<authMethods.SendCodeResult>;
    /**
     * Sends an email verification code for login setup.
     * This is used when Telegram requires email verification during login.
     * @param phoneNumber - The phone number being used for login
     * @param phoneCodeHash - The phone code hash from sendCode
     * @param email - The email address to verify
     * @returns The email pattern and code length
     * @example
     * ```ts
     * const result = await client.sendVerifyEmailCode(
     *     "+1234567890",
     *     "abc123hash",
     *     "user@example.com"
     * );
     * console.log(`Code sent to ${result.emailPattern}, length: ${result.length}`);
     * ```
     * @category Authorization
     */
    sendVerifyEmailCode(phoneNumber: string, phoneCodeHash: string, email: string): Promise<authMethods.SentEmailCodeResult>;
    /**
     * Verifies an email address during login setup.
     * @param phoneNumber - The phone number being used for login
     * @param phoneCodeHash - The phone code hash from sendCode
     * @param verification - The verification result (code, Google token, or Apple token)
     * @returns The verified email and the new sent code for phone verification
     * @example
     * ```ts
     * // Verify with email code
     * const result = await client.verifyEmail(
     *     "+1234567890",
     *     "abc123hash",
     *     "12345"
     * );
     *
     * // Or verify with Google Sign-In
     * const result = await client.verifyEmail(
     *     "+1234567890",
     *     "abc123hash",
     *     { type: "google", token: "google-id-token" }
     * );
     * ```
     * @category Authorization
     */
    verifyEmail(phoneNumber: string, phoneCodeHash: string, verification: authMethods.EmailVerificationResult): Promise<authMethods.EmailVerifiedLoginResult>;
    /**
     * Resets the login email when the user cannot access their current email.
     * This will cancel the current email verification and allow setting up a new one.
     * @param phoneNumber - The phone number being used for login
     * @param phoneCodeHash - The phone code hash from sendCode
     * @returns The new sent code result
     * @example
     * ```ts
     * // User can't access their email, reset it
     * const newSentCode = await client.resetLoginEmail("+1234567890", "abc123hash");
     * ```
     * @category Authorization
     */
    resetLoginEmail(phoneNumber: string, phoneCodeHash: string): Promise<Api.auth.TypeSentCode>;
    /**
     * Uses the 2FA password to sign in the account.<br/>
     * This function should be used after the user has signed in with the code they received.
     * @param apiCredentials - credentials to be used.
     * @param authParams - user auth params.
     * @returns the logged in user.
     * @category Authorization
     */
    signInWithPassword(apiCredentials: authMethods.ApiCredentials, authParams: authMethods.UserPasswordAuthParams): Promise<Api.TypeUser>;
    /**
     * Used to sign in as a bot.
     * @example
     * ```ts
     * await client.connect();
     * const bot = await client.signInBot({
     *     apiId:1234,
     *     apiHash:"12345",
     * },{
     *     botToken:"123456:abcdfghae4fg654",
     * });
     * // we are now logged in as a bot
     * console.log("Logged in",bot);
     * ```
     * @param apiCredentials - credentials to be used.
     * @param authParams - user auth params.
     * @return instance User of the logged in bot.
     * @category Authorization
     */
    signInBot(apiCredentials: authMethods.ApiCredentials, authParams: authMethods.BotAuthParams): Promise<Api.TypeUser>;
    /**
     * Signs in with a web authorization token
     * (`auth.importWebTokenAuthorization`).
     *
     * Users only — bots cannot invoke this. It may be used over an
     * unauthenticated connection, so a plain {@link TelegramClient.connect} is
     * enough beforehand. The token is **short-lived**: once expired — or
     * already redeemed elsewhere, e.g. by the browser that opened the login
     * URL — the server answers `WEBAUTH_TOKEN_EXPIRED`.
     *
     * @param apiCredentials - Your `{ apiId, apiHash }`.
     * @param webAuthToken - The authorization token.
     * @returns The signed-in user.
     * @throws `API_ID_INVALID` when the API credentials are wrong.
     * @throws `WEBAUTH_TOKEN_EXPIRED` when the token is no longer valid.
     * @example
     * ```ts
     * await client.connect();
     * const me = await client.signInWithWebToken({ apiId, apiHash }, token);
     * console.log(client.session.save());
     * ```
     * @category Authorization
     */
    signInWithWebToken(apiCredentials: authMethods.ApiCredentials, webAuthToken: string): Promise<Api.User>;
    /**
     * Changes the 2FA settings of the logged in user.
     Note that this method may be *incredibly* slow depending on the
     prime numbers that must be used during the process to make sure
     that everything is safe.

     Has no effect if both current and new password are omitted.

     * @param client: The telegram client instance
     * @param isCheckPassword: Must be ``true`` if you want to check the current password
     * @param currentPassword: The current password, to authorize changing to ``new_password``.
     Must be set if changing existing 2FA settings.
     Must **not** be set if 2FA is currently disabled.
     Passing this by itself will remove 2FA (if correct).
     * @param newPassword: The password to set as 2FA.
     If 2FA was already enabled, ``currentPassword`` **must** be set.
     Leaving this blank or `undefined` will remove the password.
     * @param hint: Hint to be displayed by Telegram when it asks for 2FA.
     Must be set when changing or creating a new password.
     Has no effect if ``newPassword`` is not set.
     * @param email: Recovery and verification email. If present, you must also
     set `emailCodeCallback`, else it raises an Error.
     * @param emailCodeCallback: If an email is provided, a callback that returns the code sent
     to it must also be set. This callback may be asynchronous.
     It should return a string with the code. The length of the
     code will be passed to the callback as an input parameter.
     * @param onEmailCodeError: Called when an error happens while sending an email.

     If the callback returns an invalid code, it will raise an rpc error with the message
     ``CODE_INVALID``

     * @returns Promise<void>
     * @throws this method can throw:
     "PASSWORD_HASH_INVALID" if you entered a wrong password (or set it to undefined).
     "EMAIL_INVALID" if the entered email is wrong
     "EMAIL_HASH_EXPIRED" if the user took too long to verify their email
     * @category Authorization
     */
    updateTwoFaSettings({ isCheckPassword, currentPassword, newPassword, hint, email, emailCodeCallback, onEmailCodeError, }: twoFA.TwoFaParams): Promise<void>;
    /**
     * Makes an inline query to the specified  bot and gets the result list.<br/>
     * This is equivalent to writing `@pic something` in clients
     * @param bot - the bot entity to which the inline query should be made
     * @param query - the query string that should be made for that bot (up to 512 characters). can be empty
     * @param entity - The entity where the inline query is being made from.<br/>
     * Certain bots use this to display different results depending on where it's used, such as private chats, groups or channels.<br/>
     * If specified, it will also be the default entity where the message will be sent after clicked.<br/>
     * Otherwise, the “empty peer” will be used, which some bots may not handle correctly.
     * @param offset - String offset of the results to be returned. can be empty
     * @param geoPoint - The geo point location information to send to the bot for localised results. Available under some bots.
     * @return a list of InlineResults
     * @example
     * ```ts
     * // Makes the query to @pic
     * const results = await client.inlineQuery("pic", "something");
     * // clicks on the first result
     * await results[0].click();
     * ```
     * @category Bots
     */
    inlineQuery(bot: EntityLike, query: string, entity?: Api.InputPeerSelf, offset?: string, geoPoint?: Api.TypeInputGeoPoint): Promise<import("../tl/custom/inlineResults").InlineResults>;
    /**
     * Builds a ReplyInlineMarkup or ReplyKeyboardMarkup for the given buttons.<br/><br/>
     * Does nothing if either no buttons are provided or the provided argument is already a reply markup.<br/><br/>
     * this function is called internally when passing an array of buttons.

     * @param buttons - The button, array of buttons, array of array of buttons or markup to convert into a markup.
     * @param inlineOnly - Whether the buttons **must** be inline buttons only or not.
     * @example
     * ```ts
     * import {Button} from "teleproto/tl/custom/button";
     *  // PS this function is not async
     * const markup = client.buildReplyMarkup(Button.inline("Hello!"));
     *
     * await client.sendMessage(chat, {
     *     message: "click me!",
     *     buttons: markup,
     * }
     *
     * // The following example can also be used in a simpler way like so
     *
     * await client.sendMessage(chat, {
     *     message: "click me!",
     *     buttons: [Button.inline("Hello!")],
     * }
     * ```
     * @category Messages
     */
    buildReplyMarkup(buttons: MarkupLike | undefined, inlineOnly?: boolean): Api.TypeReplyMarkup | undefined;
    /**
     * Low-level method to download files from their input location.
     * downloadMedia should generally be used over this.
     * @param inputLocation - The file location from which the file will be downloaded. See getInputLocation source for a complete list of supported types.
     * @param fileParams - {@link DownloadFileParams}
     * @return a Buffer downloaded from the inputFile.
     * @example
     * ```ts
     * const photo = message.photo;
     * const buffer = await client.downloadFile(
     *       new Api.InputPhotoFileLocation({
     *          id: photo.id,
     *          accessHash: photo.accessHash,
     *          fileReference: photo.fileReference,
     *          thumbSize: size.type
     *      }),
     *      {
     *          dcId: photo.dcId,
     *          fileSize: "m",
     *      }
     * );
     * ```
     * @category Files
     */
    downloadFile(inputLocation: Api.TypeInputFileLocation, fileParams?: downloadMethods.DownloadFileParams): Promise<string | Buffer | undefined>;
    /**
     * Downloads the profile photo from the given user,chat or channel.<br/>
     * This method will return an empty buffer in case of no profile photo.
     * @param entity - where to download the photo from.
     * @param downloadProfilePhotoParams - {@link DownloadProfilePhotoParams}
     * @return buffer containing the profile photo. can be empty in case of no profile photo.
     * @example
     * ```ts
     * // Download your own profile photo
     * const buffer = await client.downloadProfilePhoto('me')
     * console.log("Downloaded image is",buffer);
     * // if you want to save it as a file you can use the fs module on node for that.
     * import { promises as fs } from 'fs';
     * await fs.writeFile("picture.jpg",buffer);
     * ```
     * @category Files
     */
    downloadProfilePhoto(entity: EntityLike, downloadProfilePhotoParams?: downloadMethods.DownloadProfilePhotoParams | string): Promise<string | Buffer | undefined>;
    /**
     * Downloads the given media from a message or a media object.<br/>
     * this will return an empty Buffer in case of wrong or empty media.
     * @param messageOrMedia - instance of a message or a media.
     * @param downloadParams {@link DownloadMediaInterface}
     * @return a buffer containing the downloaded data if outputFile is undefined else nothing.
     * @example ```ts
     * const buffer = await client.downloadMedia(message, {})
     * // to save it to a file later on using fs.
     * import { promises as fs } from 'fs';
     * await fs.writeFile("file",buffer);
     * // to use a progress callback you can pass it like so.
     * const buffer = await client.downloadMedia(message, {
     *     progressCallback : console.log
     * })
     * ```
     * @category Files
     */
    downloadMedia(messageOrMedia: Api.Message | Api.TypeMessageMedia, downloadParams?: DownloadMediaInterface | string): Promise<string | Buffer | undefined>;
    /**
     * This property is the default parse mode used when sending messages. Defaults to {@link MarkdownParser}.<br/>
     * It will always be either undefined or an object with parse and unparse methods.<br/>
     * When setting a different value it should be one of:<br/>
     *<br/>
     *  - Object with parse and unparse methods.<br/>
     *  - A str indicating the parse_mode. For Markdown 'md' or 'markdown' may be used. For HTML, 'html' may be used.<br/>
     * The parse method should be a function accepting a single parameter, the text to parse, and returning a tuple consisting of (parsed message str, [MessageEntity instances]).<br/>
     * <br/>
     * The unparse method should be the inverse of parse such that text == unparse(parse(text)).<br/>
     * <br/>
     * See {@link Api.TypeMessageEntity} for allowed message entities.
     * @example
     * ```ts
     * // gets the current parse mode.
     * console.log("parse mode is :",  client.parseMode)
     * ```
     * @category Messages
     */
    get parseMode(): parseMethods.ParseInterface | undefined;
    /** Setter for parseMode.
     * {@link parseMode}
     * @param mode can be md,markdown for Markdown or html for html. can also pass a custom mode.
     * pass undefined for no parsing.
     * @example
     * // sets the mode to HTML
     * client.setParseMode("html");
     * await client.sendMessage("me",{message:"<u>This is an underline text</u>"});
     * // disable formatting
     * client.setParseMode(undefined);
     * await client.sendMessage("me",{message:"<u> this will be sent as it is</u> ** with no formatting **});
     * @category Messages
     */
    setParseMode(mode: "md" | "md2" | "markdown" | "markdownv2" | "html" | parseMethods.ParseInterface | undefined): void;
    /** @hidden */
    _sanitizeParseMode(mode: string | parseMethods.ParseInterface): parseMethods.ParseInterface;
    /**
     * Iterates over the messages for a given chat.
     * <br/>
     * The default order is from newest to oldest but can be changed with the reverse param.<br/>
     * If either `search`, `filter` or `fromUser` are provided this will use {@link Api.messages.Search} instead of {@link Api.messages.GetHistory}.
     * @remarks
     * Telegram limits GetHistory requests every 10 requests (1 000 messages) therefore a sleep of 1 seconds will be the default for this limit.
     * @param entity - The entity from whom to retrieve the message history.<br/>
     * It may be undefined to perform a global search, or to get messages by their ID from no particular chat<br/>
     * **Note** that some of the offsets will not work if this is the case.<br/>
     * **Note** that if you want to perform a global search, you must set a non-empty search string, a filter. or fromUser.
     * @param iterParams - {@link IterMessagesParams}
     * @yield Instances of custom {@link Message}
     * @example
     * ```ts
     * // From most-recent to oldest
     * for await (const message of client.iterMessages(chat,{}){
     *    console.log(message.id, message.text)
     * }
     *
     * // From oldest to most-recent
     * for await (const message of client.iterMessages(chat,{reverse:true}){
     *    console.log(message.id, message.text)
     * }
     *
     * // Filter by sender
     * for await (const message of client.iterMessages(chat,{fromUser:"me"}){
     *    console.log(message.id, message.text)
     * }
     *
     * // Server-side search with fuzzy text
     * for await (const message of client.iterMessages(chat,{search:"hello"}){
     *    console.log(message.id, message.text)
     * }
     *
     * // Filter by message type:
     * import { Api } from "teleproto";
     * for await (const message of client.iterMessages(chat,{filter: Api.InputMessagesFilterPhotos}){
     *    console.log(message.id, message.photo)
     * }
     *
     * // Getting comments from a post in a channel:
     *  * for await (const message of client.iterMessages(chat,{replyTo: 123}){
     *    console.log(message.chat.title,, message.text)
     * }
     * ```
     * @category Messages
     */
    iterMessages(entity: EntityLike | undefined, iterParams?: Partial<messageMethods.IterMessagesParams>): messageMethods._IDsIter | messageMethods._MessagesIter;
    /**
     * Same as iterMessages() but returns a TotalList instead.<br/>
     * if the `limit` is not set, it will be 1 by default unless both `minId` **and** `maxId` are set. in which case the entire  range will be returned.<br/>
     * @param entity - The entity from whom to retrieve the message history. see {@link TelegramClient.iterMessages}.<br/>
     * @param getMessagesParams - see {@link IterMessagesParams}.
     * @return {@link TotalList} of messages.
     * @example
     * ```ts
     * // The totalList has a .total attribute which will show the complete number of messages even if none are fetched.
     * // Get 0 photos and print the total to show how many photos there are
     * import { Api } from "teleproto";
     * const photos = await client.getMessages(chat, {limit: 0, filter:Api.InputMessagesFilterPhotos})
     * console.log(photos.total)
     *
     * // Get all the photos
     * const photos = await client.getMessages(chat, {limit: undefined, filter:Api.InputMessagesFilterPhotos})
     *
     // Get messages by ID:
     * const messages = await client.getMessages(chat, {ids:1337})
     * const message_1337 = messages[0];
     * ```
     * @category Messages
     */
    getMessages(entity: EntityLike | undefined, getMessagesParams?: Partial<messageMethods.IterMessagesParams>): Promise<import("../Helpers").TotalList<Api.Message>>;
    /** @hidden */
    getCommentData(entity: EntityLike, message: number | Api.Message): Promise<{
        entity: Api.TypeInputPeer;
        replyTo: number;
    }>;
    /**
     * Sends a message to the specified user, chat or channel.<br/>
     * The default parse mode is the same as the official applications (a custom flavour of markdown). **bold**, `code` or __italic__ are available.<br/>
     * In addition you can send [links](https://example.com) and [mentions](@username) (or using IDs like in the Bot API: [mention](tg://user?id=123456789)) and pre blocks with three backticks.<br/>
     * <br/>
     * Sending a /start command with a parameter (like ?start=data) is also done through this method. Simply send '/start data' to the bot.<br/>
     * <br/>
     * See also Message.respond() and Message.reply().
     *
     * @param entity - Who to sent the message to.
     * @param sendMessageParams - see {@link SendMessageParams}
     * @return
     * The sent custom Message.
     * @example
     * ```ts
     * // Markdown is the default.
     * await client.sendMessage("me",{message:"Hello **world!**});
     *
     * // Defaults to another parse mode.
     * client.setParseMode("HTML");
     *
     * await client.sendMessage('me', {message:'Some <b>bold</b> and <i>italic</i> text'})
     * await client.sendMessage('me', {message:'An <a href="https://example.com">URL</a>'})
     * await client.sendMessage('me', {message:'<a href="tg://user?id=me">Mentions</a>'})
     *
     * // Explicit parse mode.
     * //  No parse mode by default
     * client.setParseMode(undefined);
     * //...but here I want markdown
     * await client.sendMessage('me', {message:'Hello, **world**!', {parseMode:"md"}})
     *
     * // ...and here I need HTML
     * await client.sendMessage('me', {message:'Hello, <i>world</i>!', {parseMode='html'}})
     *
     *
     * // Scheduling a message to be sent after 5 minutes
     *
     * await client.sendMessage(chat, {message:'Hi, future!', schedule:(60 * 5) + (Date.now() / 1000)})
     *
     * ```
     * @category Messages
     */
    sendMessage(entity: EntityLike, sendMessageParams?: messageMethods.SendMessageParams): Promise<Api.Message>;
    /**
     * Forwards the given messages to the specified entity.<br/>
     *<br/>
     * If you want to "forward" a message without the forward header
     * (the "forwarded from" text), you should use `sendMessage` with
     * the original message instead. This will send a copy of it.
     *<br/>
     * See also {@link Message.forwardTo}`.
     * @param entity - To which entity the message(s) will be forwarded.
     * @param forwardMessagesParams - see {@link ForwardMessagesParams}
     * @return The list of forwarded Message, Note.<br/>
     * if some messages failed to be forwarded the returned list will have them as undefined.
     * @example ```ts
     * // a single one
     * await client.forwardMessages(chat, {messages: message});
     * // or
     * await client.forwardMessages(chat, {messages:messageId,fromPeer:fromChat});
     * // or
     * await message.forwardTo(chat)
     *
     * // multiple
     * await client.forwardMessages(chat, {messages:messages});
     * // or
     * await client.forwardMessages(chat,  {messages:messageIds,fromPeer:fromChat});
     *
     * // Forwarding as a copy
     * await client.sendMessage(chat, {message:message});
     * ```
     * @category Messages
     */
    forwardMessages(entity: EntityLike, forwardMessagesParams: messageMethods.ForwardMessagesParams): Promise<Api.Message[]>;
    /**
     *  Used to edit a message by changing it's text or media
     *  message refers to the message to be edited not what to edit
     *  text refers to the new text
     *  See also Message.edit()<br/>
     *  Notes: It is not possible to edit the media of a message that doesn't contain media.
     *  @param entity - From which chat to edit the message.<br/>
     *  This can also be the message to be edited, and the entity will be inferred from it, so the next parameter will be assumed to be the message text.<br/>
     *  You may also pass a InputBotInlineMessageID, which is the only way to edit messages that were sent after the user selects an inline query result. Not supported yet!
     *  @param editMessageParams - see {@link EditMessageParams}.
     *  @return The edited Message.
     *  @throws
     *  `MESSAGE_AUTHOR_REQUIRED` if you're not the author of the message but tried editing it anyway.
     *  `MESSAGE_NOT_MODIFIED` if the contents of the message were not modified at all.
     *  `MESSAGE_ID_INVALID` if the ID of the message is invalid (the ID itself may be correct, but the message with that ID cannot be edited).<br/>
     *  For example, when trying to edit messages with a reply markup (or clear markup) this error will be raised.
     *  @example
     *  ```ts
     *  const message = await client.sendMessage(chat,{message:"Hi!"});
     *
     *  await client.editMessage(chat,{message:message,text:"Hello!"}
     *  // or
     *  await client.editMessage(chat,{message:message.id,text:"Hello!"}
     *  ```
     * @category Messages
     */
    editMessage(entity: EntityLike, editMessageParams: messageMethods.EditMessageParams): Promise<Api.Message>;
    /**
     * Deletes the given messages, optionally "for everyone".
     *
     * See also {@link Message.delete}`.
     *
     * @remarks This method does **not** validate that the message IDs belong to the chat that you passed! It's possible for the method to delete messages from different private chats and small group chats at once, so make sure to pass the right IDs.
     * @param entity - From who the message will be deleted. This can actually be `undefined` for normal chats, but **must** be present for channels and megagroups.
     * @param messageIds - The IDs (or ID) or messages to be deleted.
     * @param revoke - Whether the message should be deleted for everyone or not.
     * By default it has the opposite behaviour of official clients,
     * and it will delete the message for everyone.
     * Disabling this has no effect on channels or megagroups,
     * since it will unconditionally delete the message for everyone.
     * @return
     * A list of {@link AffectedMessages}, each item being the result for the delete calls of the messages in chunks of 100 each.
     * @example
     *  ```ts
     *  await client.deleteMessages(chat, messages);
     *
     *  await client.deleteMessages(chat, messages, {revoke:false});
     *  ```
     * @category Messages
     */
    deleteMessages(entity: EntityLike | undefined, messageIds: MessageIDLike[], { revoke }: {
        revoke?: boolean | undefined;
    }): Promise<Api.messages.AffectedMessages[]>;
    /**
     * Pins a message in a chat.
     *
     * See also {@link Message.pin}`.
     *
     * @remarks The default behavior is to **not** notify members, unlike the official applications.
     * @param entity - The chat where the message should be pinned.
     * @param message - The message or the message ID to pin. If it's `undefined`, all messages will be unpinned instead.
     * @param pinMessageParams - see {@link UpdatePinMessageParams}.
     * @return
     * The pinned message. if message is undefined the return will be {@link AffectedHistory}
     * @example
     *  ```ts
     *  const message = await client.sendMessage(chat, 'teleproto is awesome!');
     *
     *  await client.pinMessage(chat, message);
     *  ```
     * @category Messages
     */
    pinMessage(entity: EntityLike, message?: undefined, pinMessageParams?: messageMethods.UpdatePinMessageParams): Promise<Api.messages.AffectedHistory>;
    pinMessage(entity: EntityLike, message: MessageIDLike, pinMessageParams?: messageMethods.UpdatePinMessageParams): Promise<Api.Message>;
    /**
     * Unpins a message in a chat.
     *
     * See also {@link Message.unpin}`.
     *
     * @remarks The default behavior is to **not** notify members, unlike the official applications.
     * @param entity - The chat where the message should be unpinned.
     * @param message - The message or the message ID to unpin. If it's `undefined`, all messages will be unpinned instead.
     * @param pinMessageParams - see {@link UpdatePinMessageParams}.
     * @return
     * The pinned message. if message is undefined the return will be {@link AffectedHistory}
     * @example
     *  ```ts
     *  const message = await client.sendMessage(chat, 'teleproto is awesome!');
     *
     *  // unpin one message
     *  await client.unpinMessage(chat, message);
     *
     *  // unpin all messages
     *  await client.unpinMessage(chat);
     *  ```
     * @category Messages
     */
    unpinMessage(entity: EntityLike, message?: undefined, pinMessageParams?: messageMethods.UpdatePinMessageParams): Promise<Api.messages.AffectedHistory>;
    unpinMessage(entity: EntityLike, message: MessageIDLike, pinMessageParams?: messageMethods.UpdatePinMessageParams): Promise<undefined>;
    /**
     * Marks messages as read and optionally clears mentions. <br/>
     * This effectively marks a message as read (or more than one) in the given conversation. <br />
     * If a message or maximum ID is provided, all the messages up to and
     * including such ID will be marked as read (for all messages whose ID ≤ max_id).
     *
     * See also {@link Message.markRead}`.
     *
     * @remarks If neither message nor maximum ID are provided, all messages will be marked as read by assuming that `max_id = 0`.
     * @param entity - The chat where the message should be pinned.
     * @param message - The message or the message ID to pin. If it's `undefined`, all messages will be unpinned instead.
     * @param markAsReadParams - see {@link MarkAsReadParams}.
     * @return boolean
     * @example
     *  ```ts
     *  // using a Message object
     *  const message = await client.sendMessage(chat, 'teleproto is awesome!');
     *  await client.markAsRead(chat, message)
     *  // ...or using the int ID of a Message
     *  await client.markAsRead(chat, message.id);
     *
     *  // ...or passing a list of messages to mark as read
     *  await client.markAsRead(chat, messages)
     *  ```
     * @category Messages
     */
    markAsRead(entity: EntityLike, message?: MessageIDLike | MessageIDLike[], markAsReadParams?: messageMethods.MarkAsReadParams): Promise<boolean>;
    /**
     * Sends a reaction to a message.
     *
     * @param entity - The chat/channel where the message is.
     * @param messageId - The message ID to react to.
     * @param reaction - Array of reactions. Use Api.ReactionEmoji or Api.ReactionCustomEmoji.
     * @param big - Whether to show a big animation.
     * @param addToRecent - Whether to add the reaction to your recent reactions list.
     * @example
     * ```ts
     * await client.sendReaction(chat, 123, [new Api.ReactionEmoji({ emoticon: "👍" })]);
     * ```
     * @category Messages
     */
    sendReaction(entity: EntityLike, messageId: number, reaction?: Api.TypeReaction[], big?: boolean, addToRecent?: boolean): Promise<Api.TypeUpdates>;
    /**
     * Gets users who reacted to a message.
     *
     * @param entity - The chat/channel where the message is.
     * @param messageId - The message ID.
     * @param params.reaction - Filter by specific emoji string or a raw Api.TypeReaction (e.g. custom emoji).
     * @param params.limit - Maximum number of users to return.
     * @param params.offset - Pagination offset.
     * @category Messages
     */
    getReactionUsers(entity: EntityLike, messageId: number, params?: {
        reaction?: string | Api.TypeReaction;
        limit?: number;
        offset?: string;
    }): Promise<Api.messages.MessageReactionsList>;
    /**
     * Sends a poll or quiz to the given chat.
     *
     * @param entity - The chat where the poll should be sent.
     * @param poll - The poll definition, see {@link SendPollParams}.
     * @param params - Common send options (silent, schedule, replyTo, etc).
     * @example
     * ```ts
     * await client.sendPoll(chat, {
     *     question: "Best transport?",
     *     answers: ["TCP full", "Abridged", "Obfuscated"],
     * });
     * await client.sendPoll(chat, {
     *     question: "2 + 2 = ?",
     *     answers: ["3", "4"],
     *     quiz: true,
     *     correctAnswers: 1,
     *     solution: "Basic arithmetic!",
     * });
     * ```
     * @category Messages
     */
    sendPoll(entity: EntityLike, poll: messageMethods.SendPollParams, params?: Omit<uploadMethods.SendFileInterface, "file" | "caption">): Promise<Api.Message>;
    /**
     * Votes in a poll.
     *
     * @param entity - The chat where the poll message is.
     * @param message - The poll message or its ID.
     * @param options - Answer index(es) (0-based), or raw option bytes.
     * @example
     * ```ts
     * await client.vote(chat, 123, 0);
     * await client.vote(chat, 123, [0, 2]); // multiple-choice poll
     * ```
     * @category Messages
     */
    vote(entity: EntityLike, message: MessageIDLike, options: number | number[] | Buffer | Buffer[]): Promise<Api.TypeUpdates>;
    /**
     * Closes a poll you sent, preventing further votes.
     *
     * @param entity - The chat where the poll message is.
     * @param message - The poll message or its ID.
     * @returns The closed {@link Api.Poll} with its final results. Closing a
     * poll emits an `updateMessagePoll`, not a message update, so there is no
     * message to hand back here — read it with {@link TelegramClient.getMessages} if you need one.
     * @category Messages
     */
    closePoll(entity: EntityLike, message: MessageIDLike): Promise<Api.Poll>;
    /**
     * Gets scheduled messages of a chat.
     *
     * @param entity - The chat whose scheduled messages should be fetched.
     * @param ids - Specific scheduled message ID(s). Omit to fetch all.
     * @category Messages
     */
    getScheduledMessages(entity: EntityLike, ids?: number | number[]): Promise<Api.Message[]>;
    /**
     * Sends scheduled messages immediately, without waiting for their date.
     *
     * @param entity - The chat where the scheduled messages are.
     * @param ids - The scheduled message ID(s) to send now.
     * @returns The sent messages.
     * @category Messages
     */
    sendScheduledMessages(entity: EntityLike, ids: number | number[]): Promise<Api.Message[]>;
    /**
     * Deletes scheduled messages before they are sent.
     *
     * @param entity - The chat where the scheduled messages are.
     * @param ids - The scheduled message ID(s) to delete.
     * @category Messages
     */
    deleteScheduledMessages(entity: EntityLike, ids: number | number[]): Promise<void>;
    /**
     * Copies messages to another chat without the "forwarded from" header.
     * Same as {@link forwardMessages} with `dropAuthor` always set.
     *
     * @param entity - The chat the messages should be copied to.
     * @param copyMessagesParams - see {@link ForwardMessagesParams}.
     * @category Messages
     */
    copyMessages(entity: EntityLike, copyMessagesParams: Omit<messageMethods.ForwardMessagesParams, "dropAuthor">): Promise<Api.Message[]>;
    /**
     * Saves a message draft in the given chat.
     *
     * @param entity - The chat where the draft should be saved.
     * @param params - see {@link SaveDraftParams}. Empty params clear the draft.
     * @example
     * ```ts
     * await client.saveDraft(chat, { message: "answer this tomorrow", replyTo: 123 });
     * ```
     * @category Messages
     */
    saveDraft(entity: EntityLike, params?: messageMethods.SaveDraftParams): Promise<boolean>;
    /**
     * Clears the message draft in the given chat.
     *
     * @param entity - The chat whose draft should be cleared.
     * @category Messages
     */
    clearDraft(entity: EntityLike): Promise<boolean>;
    /** Clears all message drafts in all chats. */
    clearAllDrafts(): Promise<boolean>;
    /**
     * Fetches a message by its t.me link.
     *
     * Supports public (`t.me/username/123`), private (`t.me/c/123456/123`),
     * forum-topic and `?comment=` discussion links, plus `tg://` deep links.
     *
     * @param link - The message link.
     * @returns The message, or `undefined` if it does not exist.
     * @example
     * ```ts
     * const message = await client.getMessageByLink("https://t.me/durov/123");
     * ```
     * @category Messages
     */
    getMessageByLink(link: string): Promise<Api.Message | undefined>;
    /**
     * Gets the discussion-group counterpart of a channel post — the message
     * you reply to when leaving a comment under the post.
     *
     * @param entity - The broadcast channel where the post is.
     * @param message - The channel post or its ID.
     * @category Messages
     */
    getDiscussionMessage(entity: EntityLike, message: MessageIDLike): Promise<Api.Message | undefined>;
    /**
     * Fetches the full content of a rich message whose delivery was
     * truncated — `message.richMessage.part` set (`messages.getRichMessage`).
     * Usually you want {@link Api.Message.fetchRichMessage} instead, which
     * updates the message in place.
     *
     * @param entity - The chat where the message is.
     * @param message - The message or its ID.
     * @category Messages
     */
    getRichMessage(entity: EntityLike, message: MessageIDLike): Promise<Api.Message | undefined>;
    /**
     * Iterator over the dialogs (open conversations/subscribed channels) sequentially.<br/>
     * The order is the same as the one seen in official applications. (dialogs that had recent messages come first)
     * @param iterDialogsParams - see {@link IterDialogsParams}
     * @yield instances of custom {@link Dialog}.
     * @example
     * ```ts
     * // logs all dialog IDs and their title.
     * for await (const dialog of client.iterDialogs({})){
     *     console.log(`${dialog.id}: ${dialog.title}`);
     * }
     * ```
     * @category Dialogs
     */
    iterDialogs<IncludeCommunities extends boolean = false>(iterDialogsParams?: dialogMethods.IterDialogsParams<IncludeCommunities>): dialogMethods._DialogsIter<IncludeCommunities>;
    /**
     * Same as iterDialogs but returns a TotalList instead of an iterator.
     * @param params - {@link IterDialogsParams}
     * @example
     * ```ts
     * // Get all open conversation, print the title of the first
     * const dialogs = await client.getDialogs({});
     * const first = dialogs[0];
     * console.log(first.title);
     * <br/>
     * // Use the dialog somewhere else
     * await client.sendMessage(first, {message: "hi"});
     * <br/>
     * // Getting only non-archived dialogs (both equivalent)
     * non_archived = await client.get_dialogs({folder:0})
     * non_archived = await client.get_dialogs({archived:false})
     * <br/>
     * // Getting only archived dialogs (both equivalent)
     * archived = await client.get_dialogs({folder:1})
     * archived = await client.get_dialogs({archived:true})
     * ```
     * @category Dialogs
     */
    getDialogs<IncludeCommunities extends boolean = false>(params?: dialogMethods.IterDialogsParams<IncludeCommunities>): Promise<import("../Helpers").TotalList<import("../tl/custom/dialog").Dialog<IncludeCommunities extends false ? Api.Dialog : Api.Dialog | Api.DialogCommunity>>>;
    /**
     * Iterates over the participants belonging to a specified chat , channel or supergroup.<br/>
     * <br/>
     * Channels can return a maximum of 200 users while supergroups can return up to 10 000.<br/>
     * You must be an admin to retrieve users from a channel.<br/>
     * @param entity - The entity from which to retrieve the participants list.
     * @param params - {@link IterParticipantsParams}
     * @remarks
     * The filter ChannelParticipantsBanned will return restricted users. If you want banned users you should use ChannelParticipantsKicked instead.
     * @yield The User objects returned by GetParticipants with an additional .participant attribute<br/>
     *     which is the matched ChannelParticipant type for channels/supergroup or ChatParticipants for normal chats.
     * @example
     * ```ts
     * // logs all user IDs in a chat.
     * for await (const user of client.iterParticipants(chat)){
     *     console.log("User id",user.id);
     * }
     *
     * // Searches by name.
     * for await (const user of client.iterParticipants(chat, {search: "name"})){
     *     console.log("Username is ",user.username); // Some users don't have a username so this can be undefined.
     * }
     *
     * // Filter by admins.
     * import { Api } from "teleproto";
     *
     * for await (const user of client.iterParticipants(chat, {filter:  Api.ChannelParticipantsAdmins})){
     *     console.log("admin first name is ",user.firstName);
     * }
     * ```
     * @category Chats
     */
    iterParticipants(entity: EntityLike, params?: chatMethods.IterParticipantsParams): chatMethods._ParticipantsIter;
    /**
     * Exact same as iterParticipants but returns a TotalList instead.<br/>
     * This can be used if you want to retrieve a list instead of iterating over the users.
     * @param entity - entity to get users from.
     * @param params - {@link IterParticipantsParams}.
     * @return
     * @category Chats
     */
    getParticipants(entity: EntityLike, params?: chatMethods.IterParticipantsParams): Promise<import("../Helpers").TotalList<chatMethods.UserWithParticipant>>;
    /**
     * Kicks a user from a chat.
     *
     * Kicking yourself (`'me'`) will result in leaving the chat.
     *
     * @note
     * Attempting to kick someone who was banned will remove their
     * restrictions (and thus unbanning them), since kicking is just
     * ban + unban.
     *
     * @example
     * // Kick some user from some chat, and deleting the service message
     * const msg = await client.kickParticipant(chat, user);
     * await msg.delete();
     *
     * // Leaving chat
     * await client.kickParticipant(chat, 'me');
     * @category Chats
     */
    kickParticipant(entity: EntityLike, participant: EntityLike): Promise<Api.TypeMessage | Map<number, Api.Message> | (Api.Message | undefined)[] | undefined>;
    /**
     * Gets a single participant of a channel or supergroup.
     *
     * @param entity - The channel/supergroup.
     * @param participant - The participant to fetch.
     * @example
     * ```ts
     * const result = await client.getParticipant(channel, "username");
     * console.log(result.participant); // ChannelParticipant | ChannelParticipantAdmin | …
     * ```
     * @category Chats
     */
    getParticipant(entity: EntityLike, participant: EntityLike): Promise<Api.channels.ChannelParticipant>;
    /**
     * Bans or restricts a participant of a channel/supergroup
     * (`channels.editBanned`).
     *
     * Without params the participant is fully banned (`viewMessages`).
     * Pass an empty object to lift all restrictions (unban).
     *
     * @param entity - The channel/supergroup.
     * @param participant - The participant to ban or restrict.
     * @param params - The restrictions to apply, see {@link EditBannedParams}. A raw {@link Api.ChatBannedRights} is also accepted.
     * @example
     * ```ts
     * await client.editBanned(chat, user);                       // full ban
     * await client.editBanned(chat, user, { sendMedia: true });  // mute media
     * await client.editBanned(chat, user, {});                   // unban
     * ```
     * @category Chats
     */
    editBanned(entity: EntityLike, participant: EntityLike, params?: chatMethods.EditBannedParams | Api.ChatBannedRights): Promise<Api.TypeUpdates>;
    /**
     * Promotes, edits or demotes an admin (`channels.editAdmin`).
     *
     * Every unset right is revoked — pass an empty object to demote.
     *
     * @param entity - The chat where the rights should apply.
     * @param participant - The user to promote/demote.
     * @param params - The rights to grant, see {@link EditAdminParams}. A raw {@link Api.ChatAdminRights} is also accepted.
     * @example
     * ```ts
     * await client.editAdmin(chat, user, { deleteMessages: true, banUsers: true, rank: "mod" });
     * await client.editAdmin(chat, user, {}); // demote
     * ```
     * @category Chats
     */
    editAdmin(entity: EntityLike, participant: EntityLike, params: chatMethods.EditAdminParams | Api.ChatAdminRights): Promise<boolean | Api.TypeUpdates>;
    /**
     * Edits the default rights of ALL members of a chat
     * (`messages.editChatDefaultBannedRights`).
     *
     * @param entity - The chat.
     * @param params - The restrictions applying to every member, see {@link EditBannedParams}.
     * @category Chats
     */
    editChatDefaultBannedRights(entity: EntityLike, params: chatMethods.EditBannedParams | Api.ChatBannedRights): Promise<Api.TypeUpdates>;
    /**
     * Edits the title of a chat, channel or supergroup.
     *
     * @param entity - The chat to rename.
     * @param title - The new title.
     * @category Chats
     */
    editTitle(entity: EntityLike, title: string): Promise<Api.TypeUpdates>;
    /**
     * Edits the photo of a chat, channel or supergroup.
     *
     * @param entity - The chat.
     * @param photo - The new photo (path, Buffer, uploaded file…), a raw {@link Api.TypeInputChatPhoto}, or omit to delete the current photo.
     * @category Chats
     */
    editPhoto(entity: EntityLike, photo?: FileLike | Api.TypeInputChatPhoto): Promise<Api.TypeUpdates>;
    /**
     * Edits the description of a chat, channel or supergroup
     * (`messages.editChatAbout`).
     *
     * @param entity - The chat.
     * @param about - The new description.
     * @category Chats
     */
    editChatAbout(entity: EntityLike, about: string): Promise<boolean>;
    /**
     * Enables or changes the slow mode of a supergroup
     * (`channels.toggleSlowMode`).
     *
     * @param entity - The supergroup.
     * @param seconds - Seconds users must wait between messages. `0` (the default) disables slow mode. Allowed values: 0, 10, 30, 60, 300, 900, 3600.
     * @category Chats
     */
    toggleSlowMode(entity: EntityLike, seconds?: number): Promise<Api.TypeUpdates>;
    /**
     * Creates a new broadcast channel or supergroup
     * (`channels.createChannel`).
     *
     * @param params - see {@link CreateChannelParams}.
     * @returns The created {@link Api.Channel}.
     * @example
     * ```ts
     * const channel = await client.createChannel({ title: "My channel", about: "news" });
     * const group = await client.createChannel({ title: "My group", megagroup: true });
     * ```
     * @category Chats
     */
    createChannel(params: chatMethods.CreateChannelParams): Promise<Api.Channel>;
    /**
     * Creates a new small group chat (`messages.createChat`).
     *
     * @param params - see {@link CreateChatParams}.
     * @returns The created chat and the users that could not be invited.
     * @category Chats
     */
    createChat(params: chatMethods.CreateChatParams): Promise<{
        chat: Api.Chat;
        missingInvitees: Api.TypeMissingInvitee[];
    }>;
    /**
     * Joins a channel or supergroup (`channels.joinChannel`).
     * To join via an invite link use {@link importChatInvite}.
     *
     * @param entity - The channel to join.
     * @category Chats
     */
    joinChannel(entity: EntityLike): Promise<Api.messages.TypeChatInviteJoinResult>;
    /**
     * Joins a chat via an invite link (`messages.importChatInvite`).
     *
     * @param link - The invite link (`https://t.me/+hash`) or the bare hash.
     * @category Chats
     */
    importChatInvite(link: string): Promise<Api.messages.TypeChatInviteJoinResult>;
    /**
     * Leaves a channel or supergroup (`channels.leaveChannel`).
     *
     * @param entity - The channel to leave.
     * @category Chats
     */
    leaveChannel(entity: EntityLike): Promise<Api.TypeUpdates>;
    /**
     * Deletes the message history of a chat, optionally for the other side too
     * (`messages.deleteHistory` / `channels.deleteHistory`).
     *
     * @param entity - The chat whose history should be deleted.
     * @param params - see {@link DeleteHistoryParams}.
     * @category Chats
     */
    deleteHistory(entity: EntityLike, params?: chatMethods.DeleteHistoryParams): Promise<Api.TypeUpdates | Api.messages.AffectedHistory>;
    /**
     * Moves chats to a peer folder — `1` is the archive, `0` the main list
     * (`folders.editPeerFolders`).
     *
     * @param entity - The chat(s) to move.
     * @param folderId - The destination folder: `1` = archive, `0` = unarchive.
     * @example
     * ```ts
     * await client.editPeerFolders(chat, 1); // archive
     * await client.editPeerFolders([chatA, chatB], 0); // unarchive
     * ```
     * @category Chats
     */
    editPeerFolders(entity: EntityLike | EntityLike[], folderId: number): Promise<Api.TypeUpdates>;
    /**
     * Iterates over the admin log (recent actions) of a channel/supergroup.
     * Requires admin rights.
     *
     * @param entity - The channel/supergroup.
     * @param params - see {@link AdminLogParams}. Set filter fields to only receive those event types.
     * @yield instances of {@link Api.ChannelAdminLogEvent}.
     * @example
     * ```ts
     * for await (const event of client.iterAdminLog(channel, { ban: true, unban: true })) {
     *     console.log(event.action.className, event.userId.toString());
     * }
     * ```
     * @category Chats
     */
    iterAdminLog(entity: EntityLike, params?: chatMethods.AdminLogParams): chatMethods._AdminLogIter;
    /**
     * Gets the admin log (recent actions) of a channel/supergroup.
     * Same as {@link TelegramClient.iterAdminLog}, but returns a collected array.
     *
     * @param entity - The channel/supergroup.
     * @param params - see {@link AdminLogParams}.
     * @category Chats
     */
    getAdminLog(entity: EntityLike, params?: chatMethods.AdminLogParams): Promise<import("../Helpers").TotalList<Api.ChannelAdminLogEvent>>;
    /**
     * Sends a chat action — "typing…", "recording video…" etc.
     * (`messages.setTyping`). The action disappears automatically after a few
     * seconds or when a message is sent; repeat the call for long operations.
     *
     * @param entity - The chat where the action should be shown.
     * @param action - The action name or a raw {@link Api.TypeSendMessageAction}. Defaults to `"typing"`. Use `"cancel"` to stop.
     * @param params.topMsgId - The forum topic where the action should be shown.
     * @example
     * ```ts
     * await client.setTyping(chat);                  // typing…
     * await client.setTyping(chat, "record-video");  // recording video…
     * await client.setTyping(chat, "cancel");        // stop
     * ```
     * @category Chats
     */
    setTyping(entity: EntityLike, action?: chatMethods.ChatActionType | Api.TypeSendMessageAction, params?: {
        topMsgId?: number;
    }): Promise<boolean>;
    /**
     * Gets the chats you have in common with a user
     * (`messages.getCommonChats`).
     *
     * @param entity - The user.
     * @param params - see {@link GetCommonChatsParams}.
     * @category Chats
     */
    getCommonChats(entity: EntityLike, params?: userMethods.GetCommonChatsParams): Promise<import("../Helpers").TotalList<Api.TypeChat>>;
    /**
     * Creates a new invite link for a chat (`messages.exportChatInvite`).
     *
     * @param entity - The chat.
     * @param params - see {@link ExportChatInviteParams}.
     * @example
     * ```ts
     * const invite = await client.exportChatInvite(chat, { usageLimit: 10, requestNeeded: true });
     * if (invite instanceof Api.ChatInviteExported) console.log(invite.link);
     * ```
     * @category Invite Links
     */
    exportChatInvite(entity: EntityLike, params?: inviteLinkMethods.ExportChatInviteParams): Promise<Api.TypeExportedChatInvite>;
    /**
     * Edits or revokes an invite link (`messages.editExportedChatInvite`).
     *
     * @param entity - The chat the link belongs to.
     * @param link - The invite link to edit.
     * @param params - see {@link EditExportedChatInviteParams}. Pass `{ revoked: true }` to revoke.
     * @category Invite Links
     */
    editExportedChatInvite(entity: EntityLike, link: string, params: inviteLinkMethods.EditExportedChatInviteParams): Promise<Api.messages.TypeExportedChatInvite>;
    /**
     * Gets info about a specific invite link, including its usage counters
     * (`messages.getExportedChatInvite`).
     *
     * @param entity - The chat the link belongs to.
     * @param link - The invite link.
     * @category Invite Links
     */
    getExportedChatInvite(entity: EntityLike, link: string): Promise<Api.messages.TypeExportedChatInvite>;
    /**
     * Deletes a previously revoked invite link
     * (`messages.deleteExportedChatInvite`).
     *
     * @param entity - The chat the link belongs to.
     * @param link - The revoked invite link to delete.
     * @category Invite Links
     */
    deleteExportedChatInvite(entity: EntityLike, link: string): Promise<boolean>;
    /**
     * Deletes all revoked invite links of an admin
     * (`messages.deleteRevokedExportedChatInvites`).
     *
     * @param entity - The chat.
     * @param admin - The admin whose revoked links should be deleted. Defaults to yourself.
     * @category Invite Links
     */
    deleteRevokedExportedChatInvites(entity: EntityLike, admin?: EntityLike): Promise<boolean>;
    /**
     * Gets the list of admins that have created invite links for a chat,
     * with their link counts (`messages.getAdminsWithInvites`).
     *
     * @param entity - The chat.
     * @category Invite Links
     */
    getAdminsWithInvites(entity: EntityLike): Promise<Api.messages.ChatAdminsWithInvites>;
    /**
     * Iterates over the invite links of a chat
     * (`messages.getExportedChatInvites`).
     *
     * @param entity - The chat.
     * @param params - see {@link ExportedChatInvitesParams}.
     * @yield instances of {@link Api.TypeExportedChatInvite}.
     * @category Invite Links
     */
    iterExportedChatInvites(entity: EntityLike, params?: inviteLinkMethods.ExportedChatInvitesParams): inviteLinkMethods._ExportedChatInvitesIter;
    /**
     * Gets the invite links of a chat. Same as {@link iterExportedChatInvites},
     * but returns a collected array.
     *
     * @param entity - The chat.
     * @param params - see {@link ExportedChatInvitesParams}.
     * @category Invite Links
     */
    getExportedChatInvites(entity: EntityLike, params?: inviteLinkMethods.ExportedChatInvitesParams): Promise<import("../Helpers").TotalList<Api.TypeExportedChatInvite>>;
    /**
     * Iterates over the users that joined a chat via invite links, or over
     * pending join requests with `requested: true`
     * (`messages.getChatInviteImporters`).
     *
     * @param entity - The chat.
     * @param params - see {@link ChatInviteImportersParams}.
     * @yield instances of {@link Api.ChatInviteImporter}.
     * @example
     * ```ts
     * for await (const request of client.iterChatInviteImporters(chat, { requested: true })) {
     *     await client.hideChatJoinRequest(chat, request.userId, { approved: true });
     * }
     * ```
     * @category Invite Links
     */
    iterChatInviteImporters(entity: EntityLike, params?: inviteLinkMethods.ChatInviteImportersParams): inviteLinkMethods._ChatInviteImportersIter;
    /**
     * Gets the users that joined a chat via invite links, or pending join
     * requests with `requested: true`. Same as {@link iterChatInviteImporters},
     * but returns a collected array.
     *
     * @param entity - The chat.
     * @param params - see {@link ChatInviteImportersParams}.
     * @category Invite Links
     */
    getChatInviteImporters(entity: EntityLike, params?: inviteLinkMethods.ChatInviteImportersParams): Promise<import("../Helpers").TotalList<Api.ChatInviteImporter>>;
    /**
     * Approves or declines a pending join request
     * (`messages.hideChatJoinRequest`).
     *
     * @param entity - The chat.
     * @param user - The user whose join request should be handled.
     * @param params - `{ approved: true }` approves; omitted or false declines.
     * @category Invite Links
     */
    hideChatJoinRequest(entity: EntityLike, user: EntityLike, params?: {
        approved?: boolean;
    }): Promise<Api.TypeUpdates>;
    /**
     * Approves or declines ALL pending join requests of a chat
     * (`messages.hideAllChatJoinRequests`).
     *
     * @param entity - The chat.
     * @param params - `approved: true` approves all; `link` restricts to requests from one invite link.
     * @category Invite Links
     */
    hideAllChatJoinRequests(entity: EntityLike, params?: {
        approved?: boolean;
        link?: string;
    }): Promise<Api.TypeUpdates>;
    /**
     * Gets info about a chat by its invite link WITHOUT joining — title,
     * photo, participant count, and whether you are already a member
     * (`messages.checkChatInvite`).
     *
     * @param link - The invite link (`https://t.me/+hash`) or the bare hash.
     * @category Invite Links
     */
    checkChatInvite(link: string): Promise<Api.TypeChatInvite>;
    /**
     * Updates your profile name and/or bio (`account.updateProfile`).
     * Only the fields you set are changed.
     *
     * @param params - see {@link UpdateProfileParams}.
     * @example
     * ```ts
     * await client.updateProfile({ about: "using teleproto" });
     * ```
     * @category Account
     */
    updateProfile(params: accountMethods.UpdateProfileParams): Promise<Api.TypeUser>;
    /**
     * Changes your username (`account.updateUsername`).
     *
     * @param username - The new username. Pass an empty string to remove it.
     * @category Account
     */
    updateUsername(username: string): Promise<Api.TypeUser>;
    /**
     * Updates your online status (`account.updateStatus`).
     *
     * @param online - `true` (the default) to appear online, `false` to go offline immediately.
     * @category Account
     */
    updateStatus(online?: boolean): Promise<boolean>;
    /**
     * Uploads and sets a new profile photo or video
     * (`photos.uploadProfilePhoto`).
     *
     * @param params - see {@link UploadProfilePhotoParams}.
     * @example
     * ```ts
     * await client.uploadProfilePhoto({ file: "me.jpg" });
     * ```
     * @category Account
     */
    uploadProfilePhoto(params: accountMethods.UploadProfilePhotoParams): Promise<Api.photos.Photo>;
    /**
     * Sets an existing photo as the current profile photo
     * (`photos.updateProfilePhoto`).
     *
     * @param photo - The photo to reuse.
     * @param params.fallback - Set the fallback photo instead of the main one.
     * @param params.bot - Bot owners: change the photo of an owned bot.
     * @category Account
     */
    updateProfilePhoto(photo: Api.TypeInputPhoto | Api.TypePhoto, params?: {
        fallback?: boolean;
        bot?: EntityLike;
    }): Promise<Api.photos.Photo>;
    /**
     * Deletes profile photos (`photos.deletePhotos`).
     *
     * @param photos - The photos to delete, e.g. from {@link getUserPhotos}.
     * @category Account
     */
    deleteProfilePhotos(photos: (Api.TypeInputPhoto | Api.TypePhoto)[]): Promise<BigInteger[]>;
    /**
     * Gets the profile photos of a user (`photos.getUserPhotos`).
     *
     * @param entity - The user.
     * @param params - see {@link GetUserPhotosParams}.
     * @category Account
     */
    getUserPhotos(entity: EntityLike, params?: accountMethods.GetUserPhotosParams): Promise<import("../Helpers").TotalList<Api.TypePhoto>>;
    /**
     * Gets your contact list (`contacts.getContacts`).
     *
     * @returns The contacts as {@link Api.User} objects.
     * @category Account
     */
    getContacts(): Promise<Api.User[]>;
    /**
     * Adds a user to your contact list (`contacts.addContact`).
     *
     * @param entity - The user to add.
     * @param params - see {@link AddContactParams}.
     * @category Account
     */
    addContact(entity: EntityLike, params: contactMethods.AddContactParams): Promise<Api.TypeUpdates>;
    /**
     * Removes users from your contact list (`contacts.deleteContacts`).
     *
     * @param users - The contact(s) to remove.
     * @category Account
     */
    deleteContacts(users: EntityLike | EntityLike[]): Promise<Api.TypeUpdates>;
    /**
     * Imports phone-book contacts (`contacts.importContacts`).
     *
     * @param contacts - The entries to import, see {@link ImportContactEntry}.
     * @returns Which entries were imported and which users were already on Telegram.
     * @category Account
     */
    importContacts(contacts: contactMethods.ImportContactEntry[]): Promise<Api.contacts.ImportedContacts>;
    /**
     * Blocks a peer (`contacts.block`).
     *
     * @param entity - The peer to block.
     * @param params.myStoriesFrom - Only hide your stories from the peer instead of fully blocking.
     * @category Account
     */
    block(entity: EntityLike, params?: {
        myStoriesFrom?: boolean;
    }): Promise<boolean>;
    /**
     * Unblocks a peer (`contacts.unblock`).
     *
     * @param entity - The peer to unblock.
     * @param params.myStoriesFrom - Only unhide your stories instead of the full blocklist.
     * @category Account
     */
    unblock(entity: EntityLike, params?: {
        myStoriesFrom?: boolean;
    }): Promise<boolean>;
    /**
     * Gets your blocklist (`contacts.getBlocked`).
     *
     * @param params - see {@link GetBlockedParams}.
     * @category Account
     */
    getBlocked(params?: contactMethods.GetBlockedParams): Promise<import("../Helpers").TotalList<Api.PeerBlocked>>;
    /**
     * Terminates other authorized sessions. Pass a session hash from
     * {@link getAuthorizations} to terminate one, or nothing to terminate
     * ALL other sessions (`account.resetAuthorization` / `auth.resetAuthorizations`).
     * @category Account
     */
    resetAuthorization(hash?: BigInteger): Promise<boolean>;
    /** Gets the list of your authorized sessions (`account.getAuthorizations`). */
    getAuthorizations(): Promise<Api.account.Authorizations>;
    /**
     * Gets the privacy rules of a privacy key (`account.getPrivacy`).
     *
     * @param key - e.g. `new Api.InputPrivacyKeyStatusTimestamp()`.
     * @category Account
     */
    getPrivacy(key: Api.TypeInputPrivacyKey): Promise<Api.account.PrivacyRules>;
    /**
     * Changes the privacy rules of a privacy key (`account.setPrivacy`).
     *
     * @param key - e.g. `new Api.InputPrivacyKeyStatusTimestamp()`.
     * @param rules - e.g. `[new Api.InputPrivacyValueAllowContacts()]`.
     * @category Account
     */
    setPrivacy(key: Api.TypeInputPrivacyKey, rules: Api.TypeInputPrivacyRule[]): Promise<Api.account.PrivacyRules>;
    /** Gets the notification settings of a peer (`account.getNotifySettings`). */
    getNotifySettings(entity: EntityLike | Api.TypeInputNotifyPeer): Promise<Api.PeerNotifySettings>;
    /**
     * Changes the notification settings of a peer — mute/unmute, sounds,
     * previews (`account.updateNotifySettings`).
     *
     * @example
     * ```ts
     * await client.updateNotifySettings(chat, { muteUntil: 2147483647 }); // mute forever
     * ```
     * @category Account
     */
    updateNotifySettings(entity: EntityLike | Api.TypeInputNotifyPeer, params: accountMethods.UpdateNotifySettingsParams): Promise<boolean>;
    /** Gets the account self-destruction period, in days (`account.getAccountTTL`). */
    getAccountTTL(): Promise<number>;
    /** Sets the account self-destruction period, in days (`account.setAccountTTL`). */
    setAccountTTL(days: number): Promise<boolean>;
    /** Gets global privacy settings (`account.getGlobalPrivacySettings`). */
    getGlobalPrivacySettings(): Promise<Api.GlobalPrivacySettings>;
    /** Sets global privacy settings (`account.setGlobalPrivacySettings`). */
    setGlobalPrivacySettings(settings: Api.TypeGlobalPrivacySettings): Promise<Api.GlobalPrivacySettings>;
    /** Creates a community and returns its entity. */
    createCommunity(params: communityMethods.CreateCommunityParams): Promise<Api.Community>;
    /** Fetches full community details and linked peers. */
    getCommunity(community: EntityLike): Promise<communityMethods.FullCommunity>;
    /** Lists joined communities, retaining forbidden entries. */
    getJoinedCommunities(): Promise<import("../Helpers").TotalList<Api.CommunityForbidden | Api.Community>>;
    /** Lists linked peers with visibility and history access metadata. */
    getCommunityPeers(community: EntityLike): Promise<communityMethods.CommunityPeer[]>;
    /** Adds, changes visibility of, or removes a peer link. */
    setCommunityPeerLink(community: EntityLike, peer: EntityLike, action: communityMethods.CommunityPeerLinkAction): Promise<boolean>;
    /** Groups or expands the community in the dialog list. */
    setCommunityCollapsed(community: EntityLike, collapsed: boolean): Promise<Api.TypeUpdates>;
    /** Iterates pending links with requester and peer metadata. */
    iterCommunityPeerLinkRequests(community: EntityLike, params?: communityMethods.IterCommunityPeerLinkRequestsParams): communityMethods.CommunityPeerLinkRequestsIter;
    /** Collects pending peer links and their total count. */
    getCommunityPeerLinkRequests(community: EntityLike, params?: communityMethods.IterCommunityPeerLinkRequestsParams): Promise<import("../Helpers").TotalList<communityMethods.CommunityPeerLinkRequest>>;
    /** Approves a peer link request, or rejects it when approved is false. */
    setCommunityPeerLinkRequestApproval(community: EntityLike, peer: EntityLike, approved: boolean): Promise<boolean>;
    /** Approves or rejects all pending peer link requests. */
    setAllCommunityPeerLinkRequestsApproval(community: EntityLike, approved: boolean): Promise<boolean>;
    /** Bans a participant across the community, or unbans when banned is false. */
    setCommunityParticipantBanned(community: EntityLike, participant: EntityLike, banned: boolean): Promise<boolean>;
    /** Returns the community chats a participant owns or has joined. */
    getCommunityParticipantJoinedChats(community: EntityLike, participant: EntityLike): Promise<Api.communities.ParticipantJoinedChats>;
    /** Pins or unpins the community's grouped dialog. */
    pinCommunity(community: EntityLike, pinned?: boolean): Promise<boolean>;
    /** Fetches notification settings using the community notification scope. */
    getCommunityNotifySettings(community: EntityLike): Promise<Api.PeerNotifySettings>;
    /** Updates notification settings for the community notification scope. */
    updateCommunityNotifySettings(community: EntityLike, params: accountMethods.UpdateNotifySettingsParams): Promise<boolean>;
    /**
     * Creates a topic in a forum (`messages.createForumTopic`).
     *
     * @param entity - The forum.
     * @param params - see {@link CreateForumTopicParams}.
     * @category Forums
     */
    createForumTopic(entity: EntityLike, params: forumMethods.CreateForumTopicParams): Promise<Api.TypeUpdates>;
    /**
     * Edits a forum topic: title, icon, closed/hidden state
     * (`messages.editForumTopic`).
     *
     * @param entity - The forum.
     * @param topicId - The topic ID (its top message ID).
     * @param params - see {@link EditForumTopicParams}.
     * @example
     * ```ts
     * await client.editForumTopic(forum, 123, { closed: true });
     * ```
     * @category Forums
     */
    editForumTopic(entity: EntityLike, topicId: number, params: forumMethods.EditForumTopicParams): Promise<Api.TypeUpdates>;
    /** Pins or unpins a forum topic (`messages.updatePinnedForumTopic`). */
    updatePinnedForumTopic(entity: EntityLike, topicId: number, pinned: boolean): Promise<Api.TypeUpdates>;
    /** Reorders the pinned forum topics (`messages.reorderPinnedForumTopics`). */
    reorderPinnedForumTopics(entity: EntityLike, order: number[], params?: {
        force?: boolean;
    }): Promise<Api.TypeUpdates>;
    /**
     * Gets the topics of a forum, with their last messages
     * (`messages.getForumTopics`).
     *
     * @param entity - The forum.
     * @param params - see {@link GetForumTopicsParams}.
     * @category Forums
     */
    getForumTopics(entity: EntityLike, params?: forumMethods.GetForumTopicsParams): Promise<Api.messages.ForumTopics>;
    /** Gets specific forum topics by their IDs (`messages.getForumTopicsByID`). */
    getForumTopicsByID(entity: EntityLike, topicIds: number | number[]): Promise<Api.messages.ForumTopics>;
    /** Enables or disables forum topics in a supergroup (`channels.toggleForum`). */
    toggleForum(entity: EntityLike, enabled: boolean, tabs?: boolean): Promise<Api.TypeUpdates>;
    /** Toggles viewing a forum as a regular chat (`channels.toggleViewForumAsMessages`). */
    toggleViewForumAsMessages(entity: EntityLike, enabled: boolean): Promise<Api.TypeUpdates>;
    /**
     * Posts a story (`stories.sendStory`).
     *
     * @param entity - Where to post: `"me"` or a channel you manage.
     * @param params - see {@link SendStoryParams}.
     * @example
     * ```ts
     * await client.sendStory("me", { media: "photo.jpg", caption: "hello" });
     * ```
     * @category Stories
     */
    sendStory(entity: EntityLike, params: storyMethods.SendStoryParams): Promise<Api.TypeUpdates>;
    /** Edits a posted story (`stories.editStory`). */
    editStory(entity: EntityLike, storyId: number, params: storyMethods.EditStoryParams): Promise<Api.TypeUpdates>;
    /** Deletes stories (`stories.deleteStories`). Returns the IDs that were actually deleted. */
    deleteStories(entity: EntityLike, ids: number | number[]): Promise<number[]>;
    /** Pins stories to the profile after expiration, or unpins them (`stories.togglePinned`). */
    toggleStoriesPinned(entity: EntityLike, ids: number | number[], pinned?: boolean): Promise<number[]>;
    /** Checks whether you can post a story and how many slots remain (`stories.canSendStory`). */
    canSendStory(entity: EntityLike): Promise<Api.stories.CanSendStoryCount>;
    /** Gets the active stories of all your peers (`stories.getAllStories`). */
    getAllStories(params?: storyMethods.GetAllStoriesParams): Promise<Api.stories.TypeAllStories>;
    /** Gets the active stories of a specific peer (`stories.getPeerStories`). */
    getPeerStories(entity: EntityLike): Promise<Api.stories.PeerStories>;
    /** Gets stories by their IDs (`stories.getStoriesByID`). */
    getStoriesByID(entity: EntityLike, ids: number | number[]): Promise<Api.stories.Stories>;
    /** Gets the stories pinned on a peer's profile (`stories.getPinnedStories`). */
    getPinnedStories(entity: EntityLike, params?: storyMethods.GetStoriesPageParams): Promise<Api.stories.Stories>;
    /** Gets your story archive (`stories.getStoriesArchive`). */
    getStoriesArchive(entity: EntityLike, params?: storyMethods.GetStoriesPageParams): Promise<Api.stories.Stories>;
    /** Marks a peer's stories as read up to `maxId` (`stories.readStories`). */
    readStories(entity: EntityLike, maxId?: number): Promise<number[]>;
    /** Increments the view counter of stories (`stories.incrementStoryViews`). */
    incrementStoryViews(entity: EntityLike, ids: number | number[]): Promise<boolean>;
    /** Gets the viewers of one of your stories (`stories.getStoryViewsList`). */
    getStoryViewsList(entity: EntityLike, storyId: number, params?: storyMethods.GetStoryViewsListParams): Promise<Api.stories.StoryViewsList>;
    /** Exports a t.me link to a story (`stories.exportStoryLink`). */
    exportStoryLink(entity: EntityLike, storyId: number): Promise<Api.ExportedStoryLink>;
    /**
     * Reacts to a story (`stories.sendReaction`).
     *
     * @param reaction - An emoji string, a custom emoji document ID, or a raw {@link Api.TypeReaction}. Omit to remove the reaction.
     * @category Stories
     */
    sendStoryReaction(entity: EntityLike, storyId: number, reaction?: string | BigInteger | Api.TypeReaction, params?: {
        addToRecent?: boolean;
    }): Promise<Api.TypeUpdates>;
    /** Gets your chat folders (`messages.getDialogFilters`). */
    getDialogFilters(): Promise<Api.messages.DialogFilters>;
    /**
     * Creates, updates or deletes a chat folder
     * (`messages.updateDialogFilter`).
     *
     * @param id - The folder ID (2-255).
     * @param filter - The new folder definition, or omit to delete the folder.
     * @category Folders & Stickers
     */
    updateDialogFilter(id: number, filter?: Api.TypeDialogFilter): Promise<boolean>;
    /** Reorders your chat folders (`messages.updateDialogFiltersOrder`). */
    updateDialogFiltersOrder(order: number[]): Promise<boolean>;
    /**
     * Gets a sticker set with all its stickers (`messages.getStickerSet`).
     *
     * @param set - The set's short name (from its t.me/addstickers link) or a raw {@link Api.TypeInputStickerSet}.
     * @category Folders & Stickers
     */
    getStickerSet(set: stickerMethods.InputStickerSetLike): Promise<Api.messages.TypeStickerSet>;
    /** Gets all your installed sticker sets (`messages.getAllStickers`). */
    getAllStickers(): Promise<Api.messages.TypeAllStickers>;
    /** Installs a sticker set (`messages.installStickerSet`). */
    installStickerSet(set: stickerMethods.InputStickerSetLike, params?: {
        archived?: boolean;
    }): Promise<Api.messages.TypeStickerSetInstallResult>;
    /** Uninstalls a sticker set (`messages.uninstallStickerSet`). */
    uninstallStickerSet(set: stickerMethods.InputStickerSetLike): Promise<boolean>;
    /** Gets your recently used stickers (`messages.getRecentStickers`). */
    getRecentStickers(params?: {
        attached?: boolean;
    }): Promise<Api.messages.TypeRecentStickers>;
    /** Adds or removes a sticker from your recent stickers (`messages.saveRecentSticker`). */
    saveRecentSticker(document: Api.TypeInputDocument | Api.Document, params?: {
        unsave?: boolean;
        attached?: boolean;
    }): Promise<boolean>;
    /** Clears your recent stickers (`messages.clearRecentStickers`). */
    clearRecentStickers(params?: {
        attached?: boolean;
    }): Promise<boolean>;
    /** Gets your favorite stickers (`messages.getFavedStickers`). */
    getFavedStickers(): Promise<Api.messages.TypeFavedStickers>;
    /** Adds or removes a sticker from your favorites (`messages.faveSticker`). */
    faveSticker(document: Api.TypeInputDocument | Api.Document, params?: {
        unfave?: boolean;
    }): Promise<boolean>;
    /** Gets custom emoji documents by their IDs (`messages.getCustomEmojiDocuments`). */
    getCustomEmojiDocuments(documentIds: BigInteger[]): Promise<Api.TypeDocument[]>;
    /**
     * Bots only: sets the bot's command list (`bots.setBotCommands`).
     *
     * @param commands - see {@link BotCommandEntry}.
     * @param params - Scope and language, see {@link BotCommandScopeParams}.
     * @example
     * ```ts
     * await client.setBotCommands([{ command: "start", description: "Start the bot" }]);
     * ```
     * @category Bots
     */
    setBotCommands(commands: botMethods.BotCommandEntry[], params?: botMethods.BotCommandScopeParams): Promise<boolean>;
    /** Bots only: gets the bot's command list (`bots.getBotCommands`). */
    getBotCommands(params?: botMethods.BotCommandScopeParams): Promise<Api.BotCommand[]>;
    /** Bots only: clears the bot's command list (`bots.resetBotCommands`). */
    resetBotCommands(params?: botMethods.BotCommandScopeParams): Promise<boolean>;
    /** Sets the name/about/description of a bot you own (`bots.setBotInfo`). */
    setBotInfo(params: botMethods.SetBotInfoParams): Promise<boolean>;
    /** Gets the name/about/description of a bot (`bots.getBotInfo`). */
    getBotInfo(params?: {
        bot?: EntityLike;
        langCode?: string;
    }): Promise<Api.bots.BotInfo>;
    /** Bots only: sets the menu button of a user's chat with the bot (`bots.setBotMenuButton`). */
    setBotMenuButton(user: EntityLike, button: Api.TypeBotMenuButton): Promise<boolean>;
    /** Bots only: gets the menu button of a user's chat with the bot (`bots.getBotMenuButton`). */
    getBotMenuButton(user: EntityLike): Promise<Api.TypeBotMenuButton>;
    /** Adds a collectible username to a bot you own (`bots.addUsername`). */
    addBotUsername(bot: EntityLike, username: string): Promise<boolean>;
    /** Removes an additional username from a bot you own (`bots.removeUsername`). */
    removeBotUsername(bot: EntityLike, username: string): Promise<boolean>;
    /** Checks whether a bot username is available (`bots.checkUsername`); `additional` checks it as an extra username. */
    checkBotUsername(username: string, params?: {
        additional?: boolean;
    }): Promise<boolean>;
    /**
     * Verifies a peer as a verifier bot (`bots.setCustomVerification`).
     * A string description is parsed with `parseMode`; pass `enabled: false` to remove the verification.
     */
    setBotVerification(peer: EntityLike, params?: botMethods.SetBotVerificationParams): Promise<boolean>;
    /** Gets the state of the account's built-in wallet (`wallet.getState`). */
    getWallet(): Promise<Api.TypeWalletState>;
    /** Looks up wallet addresses of users and/or raw addresses (`wallet.getUserAddresses`). */
    getWalletAddresses(users: EntityLike | EntityLike[], params?: walletMethods.GetWalletAddressesParams): Promise<Api.WalletUserAddress[]>;
    /** Iterates wallet transactions, newest first (`wallet.getTransactions`). The iterator exposes `balance`. */
    iterWalletTransactions(params?: walletMethods.IterWalletTransactionsParams): walletMethods.WalletCursorIter<Api.WalletTransaction>;
    /** Collects wallet transactions together with the current `balance`. */
    getWalletTransactions(params?: walletMethods.IterWalletTransactionsParams): Promise<walletMethods.WalletTransactions>;
    /** Gets wallet transactions by their ids (`wallet.getTransactionsByIDs`). */
    getWalletTransactionsById(ids: string[]): Promise<Api.WalletTransaction[]>;
    /** Gets wallet transactions by message hash (`wallet.getTransactionsByMsgHash`). */
    getWalletTransactionsByHash(hashes: string[]): Promise<Api.WalletTransaction[]>;
    /** Iterates NFTs held by the wallet (`wallet.getNfts`). */
    iterWalletNfts(params?: walletMethods.IterWalletNftsParams): walletMethods.WalletCursorIter<Api.wallet.NftItem>;
    /** Collects NFTs held by the wallet. */
    getWalletNfts(params?: walletMethods.IterWalletNftsParams): Promise<import("../Helpers").TotalList<Api.wallet.NftItem>>;
    /**
     * Sends a signed wallet transfer to a user (`wallet.sendTransfer`) and returns the resulting message.
     * `data` and `gaslessData` are the signed transfer payloads; `randomId` is generated when omitted.
     */
    sendWalletTransfer(user: EntityLike, params: walletMethods.SendWalletTransferParams): Promise<Api.Message | undefined>;
    /** Lists TON Connect sessions of the wallet (`wallet.tonConnectGetSessions`). */
    getTonConnectSessions(): Promise<Api.TonConnectSession[]>;
    /** Closes a TON Connect session (`wallet.tonConnectCloseSession`). */
    closeTonConnectSession(sessionId: BigInteger, params?: {
        body?: Buffer;
    }): Promise<boolean>;
    /** Gets currency exchange rates as a map of currency code to rate (`payments.getCurrencyRates`). */
    getCurrencyRates(): Promise<Map<string, number>>;
    /**
     * Translates messages or raw text (`messages.translateText`).
     *
     * @param params - see {@link TranslateTextParams}.
     * @example
     * ```ts
     * const t = await client.translateText({ entity: chat, ids: 123, toLang: "en" });
     * const t2 = await client.translateText({ text: "привет", toLang: "en" });
     * ```
     * @category Messages
     */
    translateText(params: messageMethods.TranslateTextParams): Promise<Api.messages.TranslateResult>;
    /**
     * Gets (and optionally increments) the view/forward counters of channel
     * posts (`messages.getMessagesViews`).
     * @category Messages
     */
    getMessagesViews(entity: EntityLike, ids: number | number[], increment?: boolean): Promise<Api.messages.MessageViews>;
    /** Gets when your message was read in a private chat (`messages.getOutboxReadDate`). */
    getOutboxReadDate(entity: EntityLike, message: MessageIDLike): Promise<Api.OutboxReadDate>;
    /** Gets who read your message in a small group, with dates (`messages.getMessageReadParticipants`). */
    getMessageReadParticipants(entity: EntityLike, message: MessageIDLike): Promise<Api.ReadParticipantDate[]>;
    /**
     * Iterates over a file's contents chunk by chunk — streaming download
     * without buffering the whole file in memory (`upload.getFile`).
     *
     * @param file - A message with media, the media itself, or a raw {@link Api.TypeInputFileLocation}.
     * @param params - see {@link IterDownloadParams}.
     * @example
     * ```ts
     * for await (const chunk of client.iterDownload(message)) {
     *     stream.write(chunk);
     * }
     * ```
     * @category Messages
     */
    iterDownload(file: Api.Message | Api.MessageMediaDocument | Api.MessageMediaPhoto | Api.TypeInputFileLocation, params?: downloadMethods.IterDownloadParams): AsyncGenerator<Buffer, void, unknown>;
    /**
     * Decorator-style event handler registration.
     * Returns a function that accepts a callback and registers it for the given event.
     *
     * @example
     * ```ts
     * client.on(new NewMessage({ incoming: true }))(async (event) => {
     *     console.log(event.message.text);
     * });
     * ```
     * @category Updates
     */
    on(event: NewMessage): (f: (event: NewMessageEvent) => void) => void;
    on(event: CallbackQuery): (f: (event: CallbackQueryEvent) => void) => void;
    on(event: Album): (f: (event: AlbumEvent) => void) => void;
    on(event: EditedMessage): (f: (event: EditedMessageEvent) => void) => void;
    on(event: DeletedMessage): (f: (event: DeletedMessageEvent) => void) => void;
    on(event?: EventBuilder): (f: (event: any) => void) => void;
    /**
     * Registers a new event handler callback.<br/>
     * <br/>
     * The callback will be called when the specified event occurs.
     * @param callback - The callable function accepting one parameter to be used.<br/>
     * **Note** the event type passed in the callback will change depending on the eventBuilder.
     * @param event -The event builder class or instance to be used,
     * for example ``new events.NewMessage({});``.
     * If left unspecified, {@link Raw} (the {@link Api.TypeUpdate} objects with no further processing) will be passed instead.<br>
     *
     * @example
     *```ts
     * import {TelegramClient} from "teleproto";
     * import { NewMessage } from "teleproto/events";
     * import { NewMessageEvent } from "teleproto/events";
     * const client = new TelegramClient(new StringSession(''), apiId, apiHash, {});
     *
     * async function handler(event: NewMessageEvent) {
     * ...
     * }
     * client.addEventHandler(handler, new NewMessage({}));
     ```
     * @category Updates
     */
    addEventHandler(callback: {
        (event: NewMessageEvent): void;
    }, event: NewMessage): void;
    addEventHandler(callback: {
        (event: CallbackQueryEvent): void;
    }, event: CallbackQuery): void;
    addEventHandler(callback: {
        (event: AlbumEvent): void;
    }, event: Album): void;
    addEventHandler(callback: {
        (event: EditedMessageEvent): void;
    }, event: EditedMessage): void;
    addEventHandler(callback: {
        (event: DeletedMessageEvent): void;
    }, event: DeletedMessage): void;
    addEventHandler(callback: {
        (event: any): void;
    }, event?: EventBuilder): void;
    /**
     * Inverse operation of addEventHandler().<br>
     *
     * @param callback - the callback function to be removed.
     * @param event - the type of the event.
     * @category Updates
     */
    removeEventHandler(callback: CallableFunction, event: EventBuilder): void;
    /**
     * Lists all registered event handlers.
     * @return pair of [eventBuilder,CallableFunction]
     * @category Updates
     */
    listEventHandlers(): [EventBuilder, CallableFunction][];
    /**
     * Fetches and processes any updates that were missed while disconnected.
     * Call this after reconnecting to ensure no updates are lost.
     * @example
     * ```ts
     * await client.connect();
     * await client.catchUp(); // Fetch missed updates
     * ```
     * @category Updates
     */
    catchUp(): Promise<void>;
    /**
     * Uploads a file to Telegram's servers, without sending it.
     * @remarks generally it's better to use {@link TelegramClient.sendFile} instead.
     * This method returns a handle (an instance of InputFile or InputFileBig, as required) which can be later used before it expires (they are usable during less than a day).<br/>
     * Uploading a file will simply return a "handle" to the file stored remotely in the Telegram servers,
     * which can be later used on. This will not upload the file to your own chat or any chat at all.
     * This also can be used to update profile pictures
     * @param fileParams see {@link UploadFileParams}
     * @return {@link Api.InputFileBig} if the file size is larger than 10mb otherwise {@link Api.InputFile}
     * @example
     * ```ts
     * import { CustomFile } from "teleproto/client/uploads";
     * const toUpload = new CustomFile("photo.jpg", fs.statSync("../photo.jpg").size, "../photo.jpg");
     * const file = await client.uploadFile({
     *  file: toUpload,
     *  workers: 1,
     *  });
     *  await client.invoke(new Api.photos.UploadProfilePhoto({
     *      file: file,
     *  }));
     * ```
     * @category Files
     */
    uploadFile(fileParams: uploadMethods.UploadFileParams): Promise<Api.InputFile | Api.InputFileBig>;
    /**
     * Sends message with the given file to the specified entity.
     * This uses {@link TelegramClient.uploadFile} internally so if you want more control over uploads you can use that.
     * @param entity - who will receive the file.
     * @param sendFileParams - see {@link SendFileInterface}
     * @example
     * ```
     * // Normal files like photos
     * await client.sendFile(chat, {file:'/my/photos/me.jpg', caption:"It's me!"})
     * // or
     * await client.sendMessage(chat, {message:"It's me!", file:'/my/photos/me.jpg'})
     *
     * Voice notes or round videos
     * await client.sendFile(chat, {file: '/my/songs/song.mp3', voiceNote:True})
     * await client.sendFile(chat, {file: '/my/videos/video.mp4', videoNote:True})
     *
     * // Custom thumbnails
     * await client.sendFile(chat, {file:'/my/documents/doc.txt', thumb:'photo.jpg'})
     *
     * // Only documents
     * await client.sendFile(chat, {file:'/my/photos/photo.png', forceDocument:True})
     *
     * //logging progress
     * await client.sendFile(chat, {file: file, progressCallback=console.log})
     *
     * // Dices, including dart and other future emoji
     * await client.sendFile(chat, {file:new Api.InputMediaDice("")})
     * await client.sendFile(chat, {file:new Api.InputMediaDice("🎯")})
     *
     * // Contacts
     * await client.sendFile(chat, {file: new Api.InputMediaContact({
     *  phoneNumber:'+1 123 456 789',
     *  firstName:'Example',
     *  lastName:'',
     *  vcard:''
     *  }))
     * ```
     * @category Files
     */
    sendFile(entity: EntityLike, sendFileParams: uploadMethods.SendFileInterface): Promise<Api.Message>;
    /**
     * invokes raw Telegram requests.<br/>
     * This is a low level method that can be used to call manually any Telegram API method.<br/>
     * Generally this should only be used when there isn't a friendly method that does what you need.<br/>
     * All available requests and types are found under the `Api.` namespace.
     * @param request - The request to send. this should be of type request.
     * @param dcId - Optional dc id to use when sending.
     * @param options - Per-call cancellation, timeout, retry and flood-wait policy.
     * @return The response from Telegram.
     * @example
     * ```ts
     * //
     * const result = await client.invoke(new Api.account.CheckUsername({
     *      username: 'some string here'
     *   }));
     * console.log("does this username exist?",result);
     *
     * ```
     * @category Users
     */
    invoke<R extends Api.AnyRequest>(request: R, dcId?: number, options?: Api.ApiCallOptions): Promise<R["__response"]>;
    invokeWithSender<R extends Api.AnyRequest>(request: R, sender?: MTProtoSender | SessionLease): Promise<R["__response"]>;
    private _apiProxy?;
    /**
     * Schema-typed raw methods with automatic entity resolution and call options.
     * User and channel inputs accept usernames, IDs and matching `Api` instances.
     *
     * @example
     * ```ts
     * const full = await client.api.users.getFullUser({ id: "me" });
     * console.log(full.fullUser.about);
     * const same = await client.api.call({ _: "users.getFullUser", id: "me" });
     * await client.api.messages.sendMessage({ peer: "me", message: "Hello" });
     * ```
     * Nested TL objects accept `_` tags or existing `Api` instances.
     * Call options control DC, cancellation, timeout, retries and flood waits.
     * Results remain regular `Api` instances; RPC updates are handled automatically.
     * @category Users
     */
    get api(): Api.ApiFacade;
    /**
     * Gets the current logged in {@link Api.User}.
     * If the user has not logged in this will throw an error.
     * @param inputPeer - Whether to return the input peer version {@link Api.InputPeerUser} or the whole user {@link Api.User}.
     * @return Your own {@link Api.User}
     * @example
     * ```ts
     * const me = await client.getMe();
     * console.log("My username is",me.username);
     * ```
     * @category Users
     */
    getMe(inputPeer: true): Promise<Api.InputPeerUser>;
    getMe(inputPeer?: false): Promise<Api.User>;
    /**
     * Return true if the signed-in user is a bot, false otherwise.
     * @example
     * ```ts
     * if (await client.isBot()){
     *     console.log("I am a bot. PI is 3.14159265359);
     * } else {
     *     console.log("I am a human. Pies are delicious);
     * }
     * ```
     * @category Users
     */
    isBot(): Promise<boolean | undefined>;
    /**
     * Returns true if the user is authorized (logged in).
     * @example
     * if (await client.isUserAuthorized()){
     *     console.log("I am authorized. I can call functions and use requests");
     * }else{
     *     console.log("I am not logged in. I need to sign in first before being able to call methods");
     * }
     * @category Users
     */
    isUserAuthorized(): Promise<boolean>;
    /**
     * Turns the given entity into a valid Telegram {@link Api.User}, {@link Api.Chat} or {@link Api.Channel}.<br/>
     * You can also pass a list or iterable of entities, and they will be efficiently fetched from the network.
     * @remarks Telegram does not allow to get user profile by integer id if current client had never "saw" it.
     * @param entity - If a username is given, the username will be resolved making an API call every time.<br/>
     * Resolving usernames is an expensive operation and will start hitting flood waits around 50 usernames in a short period of time.<br/>
     * <br/>
     * Similar limits apply to invite links, and you should use their ID instead.<br/>
     * Using phone numbers (from people in your contact list), exact names, integer IDs or Peer rely on a getInputEntity first,<br/>
     * which in turn needs the entity to be in cache, unless a InputPeer was passed.<br/>
     * <br/>
     * If the entity can't be found, ValueError will be raised.
     * @return
     * {@link Api.Chat},{@link Api.Chat} or {@link Api.Channel} corresponding to the input entity. A list will be returned if more than one was given.
     * @example
     * ```ts
     * const me = await client.getEntity("me");
     * console.log("My name is", utils.getDisplayName(me));
     *
     * const chat = await client.getInputEntity("username");
     * for await (const message of client.iterMessages(chat)) {
     *     console.log("Message text is", message.text);
     * }
     *
     * // Note that you could have used the username directly, but it's
     * // good to use getInputEntity if you will reuse it a lot.
     * ```
     */
    getEntity(entity: EntityLike): Promise<Entity>;
    getEntity(entity: EntityLike[]): Promise<Entity[]>;
    /**
     * Turns the given entity into its input entity version.<br/>
     * Almost all requests use this kind of InputPeer, so this is the most suitable call to make for those cases.<br/>
     * **Generally you should let the library do its job** and don't worry about getting the input entity first, but if you're going to use an entity often, consider making the call.
     * @param entity - If a username or invite link is given, the library will use the cache.<br/>
     * This means that it's possible to be using a username that changed or an old invite link (this only happens if an invite link for a small group chat is used after it was upgraded to a mega-group).
     *<br/>
     *  - If the username or ID from the invite link is not found in the cache, it will be fetched. The same rules apply to phone numbers ('+34 123456789') from people in your contact list.
     *<br/>
     *  - If an exact name is given, it must be in the cache too. This is not reliable as different people can share the same name and which entity is returned is arbitrary,<br/>
     *  and should be used only for quick tests.
     *<br/>
     *  - If a positive integer ID is given, the entity will be searched in cached users, chats or channels, without making any call.
     *<br/>
     *  - If a negative integer ID is given, the entity will be searched exactly as either a chat (prefixed with -) or as a channel (prefixed with -100).
     *<br/>
     *  - If a Peer is given, it will be searched exactly in the cache as either a user, chat or channel.
     *<br/>
     *  - If the given object can be turned into an input entity directly, said operation will be done.
     *<br/>
     *  -If the entity can't be found, this will throw an error.
     * @return
     * {@link Api.InputPeerUser} , {@link Api.InputPeerChat} , {@link Api.InputPeerChannel} or {@link Api.InputPeerSelf} if the parameter  is "me" or "self"
     * @example
     * ```ts
     * // If you're going to use "username" often in your code
     * // (make a lot of calls), consider getting its input entity
     * // once, and then using the "user" everywhere instead.
     * user = await client.getInputEntity('username')
     *
     * // The same applies to IDs, chats or channels.
     * chat = await client.getInputEntity(-123456789)
     * ```
     * @category Users
     */
    getInputEntity(entity: EntityLike): Promise<Api.TypeInputPeer>;
    /**
     * Gets the ID for the given entity.<br/>
     * This method needs to be async because peer supports usernames, invite-links, phone numbers (from people in your contact list), etc.<br/>
     * <br/>
     * If addMark is false, then a positive ID will be returned instead. By default, bot-API style IDs (signed) are returned.
     * @param peer
     * @param addMark - whether to return a bot api style id.
     * @return the ID of the entity.
     * @example
     * ```ts
     * console.log(await client.getPeerId("me"));
     * ```
     * @category Users
     */
    getPeerId(peer: EntityLike, addMark?: boolean): Promise<string>;
    /** @hidden */
    _getInputDialog(peer: any): Promise<any>;
    /** @hidden */
    _getInputNotify(notify: any): Promise<any>;
    /** @hidden */
    private _nextMainConnection;
    _handleReconnect(): Promise<void>;
    connect(): Promise<boolean>;
    private _connectOnce;
    /** @hidden */
    _switchDC(newDc: number): Promise<boolean>;
    /**
     * Returns the DC IP address.<br/>
     * This will do an API request to fill the cache if it's the first time it's called.
     * @param dcId The DC ID.
     * @param downloadDC whether to use -1 DCs or not
     * TODO, hardcode IPs.
     * (These only support downloading/uploading and not creating a new AUTH key)
     * @category Connection
     */
    getDC(dcId: number, downloadDC?: boolean): Promise<DcAddress>;
    /** @hidden */
    _getResponseMessage(req: any, result: any, inputChat: any): Api.TypeMessage | Map<number, Api.Message> | (Api.Message | undefined)[] | undefined;
    /** @hidden */
    static get events(): any;
}
