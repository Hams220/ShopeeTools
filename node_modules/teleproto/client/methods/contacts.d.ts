import type { TelegramClient } from "../TelegramClient";
import type { EntityLike } from "../../define";
import { TotalList } from "../../Helpers";
import { Api } from "../../tl";
/** @hidden */
export declare function getContacts(client: TelegramClient): Promise<Api.User[]>;
/** Parameters for {@link addContact}. */
export interface AddContactParams {
    /** The contact's first name. */
    firstName: string;
    /** The contact's last name. */
    lastName?: string;
    /** The phone number to assign. Only needed when the user's number is hidden and you know it. */
    phone?: string;
    /** Allow the contact to see your phone number even if your privacy settings would hide it. */
    addPhonePrivacyException?: boolean;
    /** Private note about this contact, visible only to you. */
    note?: string | Api.TypeTextWithEntities;
}
/** @hidden */
export declare function addContact(client: TelegramClient, entity: EntityLike, params: AddContactParams): Promise<Api.TypeUpdates>;
/** @hidden */
export declare function deleteContacts(client: TelegramClient, users: EntityLike | EntityLike[]): Promise<Api.TypeUpdates>;
/** One phone-book entry for {@link importContacts}. */
export interface ImportContactEntry {
    /** The contact's phone number. */
    phone: string;
    /** The contact's first name. */
    firstName: string;
    /** The contact's last name. */
    lastName?: string;
    /** Private note about this contact, visible only to you. */
    note?: string | Api.TypeTextWithEntities;
    /** Arbitrary 64-bit ID echoed back in the result to map imported entries. Defaults to the array index. */
    clientId?: number;
}
/** @hidden */
export declare function importContacts(client: TelegramClient, contacts: ImportContactEntry[]): Promise<Api.contacts.ImportedContacts>;
/** @hidden */
export declare function block(client: TelegramClient, entity: EntityLike, params?: {
    myStoriesFrom?: boolean;
}): Promise<boolean>;
/** @hidden */
export declare function unblock(client: TelegramClient, entity: EntityLike, params?: {
    myStoriesFrom?: boolean;
}): Promise<boolean>;
/** Parameters for {@link getBlocked}. */
export interface GetBlockedParams {
    /** Number of results to skip. */
    offset?: number;
    /** Maximum number of results to return. */
    limit?: number;
    /** Fetch the list of users blocked from seeing your stories instead of the main blocklist. */
    myStoriesFrom?: boolean;
}
/** @hidden */
export declare function getBlocked(client: TelegramClient, params?: GetBlockedParams): Promise<TotalList<Api.TypePeerBlocked>>;
