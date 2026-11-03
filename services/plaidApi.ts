import plaid, {
    ItemPublicTokenExchangeRequest,
    AccountsGetRequest,
    LinkTokenCreateRequest,
    TransactionsGetRequest,
    TransactionsRefreshRequest,
} from 'plaid';

import {
    Products,
    CountryCode,
    AccountsGetResponse,
    TransactionsGetResponse
} from 'plaid'

import plaidClient from '../models/client'

class APIPlaid{
    public async link_token_create(userId: string): Promise<string>{
        // Account filtering isn't required here, but sometimes 
        // it's helpful to see an example. 

        const request: LinkTokenCreateRequest = {
            user: {
                client_user_id: userId,
            },
            client_name: 'Personal Finance App',
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
            language: 'en'
        };

        try {
            const response = await plaidClient.linkTokenCreate(request);
            return response.data.link_token;
        } catch (error) {
            throw error;
        }
    }
    
    public async public_token_exchange(publicToken: string): Promise<{accessToken: string; itemId: string}>{
        const request: ItemPublicTokenExchangeRequest = {
        public_token: publicToken,
        };

        try {
            const response = await plaidClient.itemPublicTokenExchange(request);
            const accessToken = response.data.access_token;
            const itemId = response.data.item_id;

            return {
                accessToken,
                itemId
            }
        } catch (error) {
            throw error;
        }
    }

    public async accounts_get(accessToken: string): Promise<AccountsGetResponse['accounts']>{
        const request: AccountsGetRequest = {
             access_token: accessToken
        };

        try {
            const response = await plaidClient.accountsGet(request);
            
            const accounts = response.data.accounts;
            return accounts;
        } catch (error) {
            throw error;
        }
    }

    public async transactions_get(accessToken: string, startDate: string, endDate: string): Promise<TransactionsGetResponse['transactions']>{
        let transactions: TransactionsGetResponse['transactions'] = [];

        try {
            const request: TransactionsGetRequest = {
                access_token: accessToken,
                start_date: startDate,
                end_date: endDate,
                options: {
                    count: 500,
                    offset: 0
                }
            }

            const response = await plaidClient.transactionsGet(request);
            let transactions = response.data.transactions;
            const total_transactions = response.data.total_transactions;

            // Manipulate the offset parameter to paginate
            // transactions and retrieve all available data
            while (transactions.length < total_transactions) {
                const paginatedRequest: TransactionsGetRequest = {
                    access_token: accessToken,
                    start_date: startDate,
                    end_date: endDate,
                    options: {
                        count: 500,
                        offset: transactions.length
                    }
                };
                const paginatedResponse = await plaidClient.transactionsGet(paginatedRequest);
                transactions = transactions.concat(paginatedResponse.data.transactions);
            }

            return transactions;

        } catch (error) {
            throw error;
        }
    }

    public async transactions_refresh(accessToken: string): Promise<void>{
        const request: TransactionsRefreshRequest = {
            access_token: accessToken,
        };

        try {
            await plaidClient.transactionsRefresh(request);
            
        } catch (error) {
            throw error;
        }
    }
}