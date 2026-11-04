import APIPlaid from './services/plaidApi';
import 'dotenv/config';
import {
    createServer,
    IncomingMessage,
    ServerResponse
 } from 'node:http';

const plaid = new APIPlaid();
const PORT = 3000;
const userTokens = new Map<string, string>();

type RequestBody = {
    userId?: string;
    publicToken?: string;
    startDate?: string;
    endDate?: string;
}

class Main{
    //Handles this connection between Frontend and Backend
    private async getRequestBody(req: IncomingMessage): Promise<RequestBody>{
        let body ='';

        for await (const chunk of req){
            body += chunk.toString();
        }

        return JSON.parse(body || '{}') as RequestBody;
    }

    private sendResponse(res: ServerResponse, data: object, status = 200){
        res.writeHead(status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });

        res.end(JSON.stringify(data));
    }

    public startServer() {

        const server = createServer(async (req, res) => {

            // Allows frontend requests from another origin
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            try {

                const body = await this.getRequestBody(req);

                // 1. Create a Plaid Link token
                if (req.url === '/api/plaid/link-token' && req.method === 'POST') {

                    if (!body.userId) {
                        this.sendResponse(res, { error: 'Missing userId' }, 400);
                        return;
                    }

                    const linkToken = await plaid.link_token_create(body.userId);

                    this.sendResponse(res, { linkToken });
                    return;
                }

                // 2. Exchange the public token for an access token
                if (req.url === '/api/plaid/exchange-token' && req.method === 'POST') {

                    if (!body.userId || !body.publicToken) {
                        this.sendResponse(res, { error: 'Missing userId or publicToken' }, 400);
                        return;
                    }

                    const result = await plaid.public_token_exchange(body.publicToken);

                    // Keep the access token on the backend
                    userTokens.set(body.userId, result.accessToken);

                    this.sendResponse(res, { success: true });
                    return;
                }

                // 3. Get account and transaction information
                if (req.url === '/api/portfolio/history' && req.method === 'POST') {

                    if (!body.userId || !body.startDate || !body.endDate) {
                        this.sendResponse(res, { error: 'Missing required information' }, 400);
                        return;
                    }

                    const accessToken = userTokens.get(body.userId);

                    if (!accessToken) {
                        this.sendResponse(res, { error: 'No linked Plaid account found' }, 404);
                        return;
                    }

                    const accounts = await plaid.accounts_get(accessToken);

                    const transactions = await plaid.transactions_get(
                        accessToken,
                        body.startDate,
                        body.endDate
                    );

                    // Format the information for the frontend
                    const result = {
                        accounts: accounts.map(account => ({
                            account_id: account.account_id,
                            name: account.name,
                            mask: account.mask
                        })),

                        transactions: transactions.map(transaction => ({
                            transaction_id: transaction.transaction_id,
                            account_id: transaction.account_id,
                            name: transaction.name,
                            merchant_name: transaction.merchant_name,
                            amount: transaction.amount,
                            iso_currency_code: transaction.iso_currency_code,
                            date: transaction.date,
                            pending: transaction.pending,
                            personal_finance_category:
                                transaction.personal_finance_category
                                    ? {
                                        primary: transaction.personal_finance_category.primary,
                                        detailed: transaction.personal_finance_category.detailed
                                    }
                                    : null
                        })),

                        demo: process.env.PLAID_ENV === 'sandbox',
                        updatedAt: new Date().toISOString()
                    };

                    this.sendResponse(res, result);
                    return;
                }

                // 4. Refresh transaction information
                if (req.url === '/api/plaid/refresh' && req.method === 'POST') {

                    if (!body.userId) {
                        this.sendResponse(res, { error: 'Missing userId' }, 400);
                        return;
                    }

                    const accessToken = userTokens.get(body.userId);

                    if (!accessToken) {
                        this.sendResponse(res, { error: 'No linked Plaid account found' }, 404);
                        return;
                    }

                    await plaid.transactions_refresh(accessToken);

                    this.sendResponse(res, { success: true });
                    return;
                }

                // Unknown endpoint
                this.sendResponse(res, { error: 'Endpoint not found' }, 404);

            } catch (error) {
                console.error(error);
                this.sendResponse(res, { error: 'Internal server error' }, 500);
            }
        });

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
}

const main = new Main();
main.startServer();