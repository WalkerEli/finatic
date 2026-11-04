
import "server-only";

import {
    ItemPublicTokenExchangeRequest,
    AccountsGetRequest,
    LinkTokenCreateRequest,
    TransactionsGetRequest,
    TransactionsRefreshRequest,
} from "plaid";

import {
    Products,
    CountryCode,
    AccountsGetResponse,
    TransactionsGetResponse,
} from "plaid";

import { plaidClient } from "@/app/api/transactions/plaid-client";

export default class APIPlaid {
    public async link_token_create(userId: string): Promise<string> {
        const request: LinkTokenCreateRequest = {
            user: {
                client_user_id: userId,
            },
            client_name: "Personal Finance App",
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
            language: "en",
        };

        const response = await plaidClient().linkTokenCreate(request);

        return response.data.link_token;
    }

    public async public_token_exchange(
        publicToken: string
    ): Promise<{ accessToken: string; itemId: string }> {
        const request: ItemPublicTokenExchangeRequest = {
            public_token: publicToken,
        };

        const response = await plaidClient().itemPublicTokenExchange(request);

        return {
            accessToken: response.data.access_token,
            itemId: response.data.item_id,
        };
    }

    public async accounts_get(
        accessToken: string
    ): Promise<AccountsGetResponse["accounts"]> {
        const request: AccountsGetRequest = {
            access_token: accessToken,
        };

        const response = await plaidClient().accountsGet(request);

        return response.data.accounts;
    }

    public async transactions_get(
        accessToken: string,
        startDate: string,
        endDate: string
    ): Promise<TransactionsGetResponse["transactions"]> {
        const request: TransactionsGetRequest = {
            access_token: accessToken,
            start_date: startDate,
            end_date: endDate,
            options: {
                count: 500,
                offset: 0,
            },
        };

        const response = await plaidClient().transactionsGet(request);

        let transactions = response.data.transactions;
        const totalTransactions = response.data.total_transactions;

        while (transactions.length < totalTransactions) {
            const paginatedRequest: TransactionsGetRequest = {
                access_token: accessToken,
                start_date: startDate,
                end_date: endDate,
                options: {
                    count: 500,
                    offset: transactions.length,
                },
            };

            const paginatedResponse =
                await plaidClient().transactionsGet(paginatedRequest);

            transactions = transactions.concat(
                paginatedResponse.data.transactions
            );
        }

        return transactions;
    }

    public async transactions_refresh(
        accessToken: string
    ): Promise<void> {
        const request: TransactionsRefreshRequest = {
            access_token: accessToken,
        };

        await plaidClient().transactionsRefresh(request);
    }
}
