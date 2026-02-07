import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectBot, Update, Command, On } from '@grammyjs/nestjs';
import { Context, InlineKeyboard, Bot } from 'grammy';
import { PrismaService } from '../prisma/prisma.service';
import { Role, OrderStatus } from '@prisma/client';

interface SessionData {
    step?: 'SELECT_PRODUCT' | 'SELECT_FACULTY' | 'ENTER_COMMENT' | 'ENTER_QUANTITY';
    selectedProductId?: number;
    selectedFacultyId?: number;
    comment?: string;

    // Admin states
    adminAction?: 'ADD_PRODUCT_NAME' | 'ADD_PRODUCT_QUANTITY' | 'UPDATE_STOCK' | 'ADD_FACULTY' | 'ADD_ADMIN';
    adminProductName?: string;
    adminProductId?: number;
    selectedRole?: Role;
}

@Update()
@Injectable()
export class BotUpdate implements OnModuleInit {
    private readonly logger = new Logger(BotUpdate.name);
    private sessions: Map<number, SessionData> = new Map();

    constructor(
        private readonly prisma: PrismaService,
        @InjectBot() private readonly bot: Bot<Context>,
    ) { }

    async onModuleInit() {
        this.logger.log('Bot initialized');
        await this.loadSuperAdminFromEnv();

        // Set up global error handler
        this.bot.catch((err) => {
            this.logger.error('Bot error:', err);
        });
    }

    private async loadSuperAdminFromEnv() {
        const superAdminId = process.env.SUPERADMIN_ID;
        if (superAdminId) {
            // Split by comma to support multiple admin IDs
            const adminIds = superAdminId.split(',').map(id => id.trim()).filter(id => id);

            for (const idString of adminIds) {
                try {
                    const telegramId = BigInt(idString);
                    let user = await this.prisma.user.findUnique({
                        where: { telegramId },
                    });

                    if (!user) {
                        user = await this.prisma.user.create({
                            data: {
                                telegramId,
                                fullName: 'SuperAdmin',
                                role: Role.SUPERADMIN,
                            },
                        });
                        this.logger.log(`SuperAdmin created: ${idString}`);
                    } else if (user.role !== Role.SUPERADMIN) {
                        await this.prisma.user.update({
                            where: { telegramId },
                            data: { role: Role.SUPERADMIN },
                        });
                        this.logger.log(`User promoted  to SuperAdmin: ${idString}`);
                    }
                } catch (error) {
                    this.logger.error(`Failed to load SuperAdmin ${idString}:`, error);
                }
            }
        }
    }

    private getSession(userId: number): SessionData {
        if (!this.sessions.has(userId)) {
            this.sessions.set(userId, {});
        }
        return this.sessions.get(userId)!;
    }

    private clearSession(userId: number) {
        this.sessions.delete(userId);
    }

    private async getOrCreateUser(ctx: Context) {
        if (!ctx.from) return null;

        const telegramId = BigInt(ctx.from.id);
        let user = await this.prisma.user.findUnique({
            where: { telegramId },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    telegramId,
                    username: ctx.from.username,
                    fullName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' '),
                    role: Role.USER,
                },
            });
        }

        return user;
    }

    private isAdmin(user: any): boolean {
        return user && (user.role === Role.ADMIN || user.role === Role.SUPERADMIN);
    }

    private isSuperAdmin(user: any): boolean {
        return user && user.role === Role.SUPERADMIN;
    }

    // ==================== USER FLOW ====================

    @Command('start')
    async onStart(ctx: Context) {
        if (!ctx.from) return;

        const user = await this.getOrCreateUser(ctx);
        if (!user) return;

        this.clearSession(ctx.from.id);

        if (this.isAdmin(user)) {
            await this.showAdminPanel(ctx, user);
        } else {
            await this.showWelcome(ctx);
        }
    }

    private async showWelcome(ctx: Context) {
        const keyboard = new InlineKeyboard().text('🛒 Do\'konga kirish', 'shop_enter');

        await ctx.reply('Xush kelibsiz!', {
            reply_markup: keyboard,
        });
    }

    @On('callback_query:data')
    async onCallbackQuery(ctx: any) {
        const data = ctx.callbackQuery.data;

        try {
            if (data === 'shop_enter') {
                await this.showProductList(ctx);
            } else if (data.startsWith('product_')) {
                await this.onProductSelect(ctx);
            } else if (data.startsWith('faculty_')) {
                await this.onFacultySelect(ctx);
            } else if (data === 'back_to_start') {
                this.clearSession(ctx.from.id);
                await this.onStart(ctx);
            } else if (data === 'back_to_products') {
                const session = this.getSession(ctx.from.id);
                session.selectedProductId = undefined;
                await this.showProductList(ctx);
            } else if (data === 'back_to_admin') {
                const user = await this.getOrCreateUser(ctx);
                await this.showAdminPanel(ctx, user);
            }
            // Admin callbacks
            else if (data === 'admin_products') {
                await this.showAdminProducts(ctx);
            } else if (data === 'admin_orders') {
                await this.showAdminOrders(ctx);
            } else if (data === 'admin_faculties') {
                await this.showAdminFaculties(ctx);
            } else if (data === 'admin_add_product') {
                await this.startAddProduct(ctx);
            } else if (data === 'admin_add_faculty') {
                await this.startAddFaculty(ctx);
            } else if (data.startsWith('admin_update_stock_')) {
                await this.startUpdateStock(ctx);
            } else if (data.startsWith('admin_delete_product_')) {
                await this.deleteProduct(ctx);
            } else if (data.startsWith('admin_delete_faculty_')) {
                await this.deleteFaculty(ctx);
            } else if (data === 'admin_manage_admins' && ctx.from) {
                const user = await this.getOrCreateUser(ctx);
                if (this.isSuperAdmin(user)) {
                    await this.showManageAdmins(ctx);
                }
            } else if (data === 'admin_add_admin' && ctx.from) {
                const user = await this.getOrCreateUser(ctx);
                if (this.isSuperAdmin(user)) {
                    await this.startAddAdmin(ctx);
                }
            } else if (data === 'admin_select_role_admin' && ctx.from) {
                await this.handleRoleSelection(ctx, Role.ADMIN);
            } else if (data === 'admin_select_role_superadmin' && ctx.from) {
                await this.handleRoleSelection(ctx, Role.SUPERADMIN);
            } else if (data.startsWith('admin_remove_') && ctx.from) {
                await this.handleRemoveAdmin(ctx);
            } else if (data.startsWith('admin_complete_order_')) {
                await this.completeOrder(ctx);
            }

            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Callback query error:', error);
            await ctx.answerCallbackQuery('Xatolik yuz berdi');
        }
    }

    private async showProductList(ctx: any) {
        const products = await this.prisma.product.findMany({
            orderBy: { name: 'asc' },
        });

        if (products.length === 0) {
            await ctx.editMessageText('Hozirda mahsulotlar mavjud emas.', {
                reply_markup: new InlineKeyboard().text('🏠 Bosh sahifa', 'back_to_start'),
            });
            return;
        }

        let message = '📦 Ombordagi mahsulotlar:\n\n';
        const keyboard = new InlineKeyboard();

        for (const product of products) {
            message += `📦 ${product.name} — ${product.quantity} ta\n`;
            keyboard.text(product.name, `product_${product.id}`).row();
        }

        keyboard.text('🏠 Bosh sahifa', 'back_to_start');

        await ctx.editMessageText(message, {
            reply_markup: keyboard,
        });
    }

    private async onProductSelect(ctx: any) {
        if (!ctx.from || !ctx.callbackQuery?.data) return;

        const productId = parseInt(ctx.callbackQuery.data.split('_')[1]);
        const session = this.getSession(ctx.from.id);
        session.selectedProductId = productId;
        session.step = 'SELECT_FACULTY';

        const faculties = await this.prisma.faculty.findMany({
            orderBy: { name: 'asc' },
        });

        if (faculties.length === 0) {
            await ctx.editMessageText('Fakultetlar mavjud emas. Admin bilan bog\'laning.', {
                reply_markup: new InlineKeyboard().text('⬅️ Orqaga', 'back_to_products'),
            });
            return;
        }

        const keyboard = new InlineKeyboard();
        for (const faculty of faculties) {
            keyboard.text(faculty.name, `faculty_${faculty.id}`).row();
        }
        keyboard.text('⬅️ Orqaga', 'back_to_products');

        await ctx.editMessageText('Qaysi fakultet?', {
            reply_markup: keyboard,
        });
    }

    private async onFacultySelect(ctx: any) {
        if (!ctx.from || !ctx.callbackQuery?.data) return;

        const facultyId = parseInt(ctx.callbackQuery.data.split('_')[1]);
        const session = this.getSession(ctx.from.id);
        session.selectedFacultyId = facultyId;
        session.step = 'ENTER_COMMENT';

        await ctx.editMessageText('Izoh kiriting:\n\n(Izoh kerak bo\'lmasa "yo\'q" yoki "-" yozing)', {
            reply_markup: new InlineKeyboard().text('⬅️ Orqaga', 'back_to_products'),
        });
    }

    @On('message:text')
    async onTextMessage(ctx: Context) {
        if (!ctx.from || !ctx.message?.text) return;

        const session = this.getSession(ctx.from.id);
        const text = ctx.message.text.trim();

        // Admin actions
        if (session.adminAction === 'ADD_PRODUCT_NAME') {
            await this.handleAddProductName(ctx, text);
            return;
        }
        if (session.adminAction === 'ADD_PRODUCT_QUANTITY') {
            await this.handleAddProductQuantity(ctx, text);
            return;
        }
        if (session.adminAction === 'UPDATE_STOCK') {
            await this.handleUpdateStock(ctx, text);
            return;
        }
        if (session.adminAction === 'ADD_FACULTY') {
            await this.handleAddFaculty(ctx, text);
            return;
        }
        if (session.adminAction === 'ADD_ADMIN') {
            await this.handleAddAdmin(ctx, text);
            return;
        }

        // User flow
        if (session.step === 'ENTER_COMMENT') {
            session.comment = text === 'yo\'q' || text === '-' ? '' : text;
            session.step = 'ENTER_QUANTITY';

            const product = await this.prisma.product.findUnique({
                where: { id: session.selectedProductId },
            });

            await ctx.reply(
                `Nechta kerak?\n\n📦 ${product?.name}\nOmborda: ${product?.quantity} ta`,
                {
                    reply_markup: new InlineKeyboard().text('❌ Bekor qilish', 'back_to_start'),
                },
            );
        } else if (session.step === 'ENTER_QUANTITY') {
            const quantity = parseInt(text);

            if (isNaN(quantity) || quantity <= 0) {
                await ctx.reply('Iltimos, to\'g\'ri son kiriting (1 dan katta)');
                return;
            }

            await this.processOrder(ctx, session, quantity);
        }
    }

    private async processOrder(ctx: Context, session: SessionData, requestedQuantity: number) {
        if (!ctx.from) return;

        const user = await this.getOrCreateUser(ctx);
        if (!user || !session.selectedProductId || !session.selectedFacultyId) return;

        const product = await this.prisma.product.findUnique({
            where: { id: session.selectedProductId },
        });

        if (!product) {
            await ctx.reply('Mahsulot topilmadi');
            return;
        }

        const availableStock = product.quantity;
        const given = Math.min(requestedQuantity, availableStock);
        const missing = Math.max(0, requestedQuantity - availableStock);

        // Create order
        const order = await this.prisma.order.create({
            data: {
                userId: user.id,
                productId: session.selectedProductId,
                facultyId: session.selectedFacultyId,
                comment: session.comment || null,
                wanted: requestedQuantity,
                given: given,
                missing: missing,
                status: given > 0 ? OrderStatus.READY : OrderStatus.PENDING,
            },
            include: {
                product: true,
                faculty: true,
            },
        });

        // Update stock if any was given
        if (given > 0) {
            await this.prisma.product.update({
                where: { id: session.selectedProductId },
                data: { quantity: availableStock - given },
            });
        }

        // Send user message
        let userMessage = '';
        if (given > 0 && missing === 0) {
            // Full order fulfilled
            userMessage = `✅ Buyurtmangiz tayyor\n\n`;
            userMessage += `📦 ${order.product.name}\n`;
            userMessage += `Miqdor: ${given} ta\n`;
            userMessage += `🏫 Fakultet: ${order.faculty.name}\n`;
            if (order.comment) userMessage += `💬 Izoh: ${order.comment}\n`;
            userMessage += `\nOmbordan olib ketishingiz mumkin!`;
        } else if (given > 0 && missing > 0) {
            // Partial fulfillment
            userMessage = `📦 ${order.product.name}\n\n`;
            userMessage += `Siz ${requestedQuantity} ta so'radingiz\n`;
            userMessage += `Omborda faqat ${given} ta mavjud\n\n`;
            userMessage += `✅ ${given} ta buyurtmangiz tayyor holatda\n`;
            userMessage += `📌 Yetmay qolgan ${missing} ta keyin beriladi\n\n`;
            userMessage += `🏫 Fakultet: ${order.faculty.name}\n`;
            if (order.comment) userMessage += `💬 Izoh: ${order.comment}`;
        } else {
            // Nothing available
            userMessage = `📦 ${order.product.name}\n\n`;
            userMessage += `Siz ${requestedQuantity} ta so'radingiz\n`;
            userMessage += `Omborda hozirda mavjud emas\n\n`;
            userMessage += `📌 ${missing} ta mahsulot qo'shilganda sizga xabar beramiz\n\n`;
            userMessage += `🏫 Fakultet: ${order.faculty.name}\n`;
            if (order.comment) userMessage += `💬 Izoh: ${order.comment}`;
        }

        await ctx.reply(userMessage, {
            reply_markup: new InlineKeyboard().text('🏠 Bosh sahifa', 'back_to_start'),
        });

        // Notify admins
        const adminMessage = `🔔 YANGI BUYURTMA\n\n` +
            `👤 User: @${user.username || user.fullName}\n` +
            `📦 Mahsulot: ${order.product.name}\n` +
            `🏫 Fakultet: ${order.faculty.name}\n` +
            `${order.comment ? `💬 Izoh: ${order.comment}\n` : ''}` +
            `📊 So'ralgan: ${requestedQuantity} ta\n` +
            `✅ Berilgan: ${given} ta\n` +
            (missing > 0 ? `❌ Yetmagan: ${missing} ta\n` : '') +
            `📅 Sana: ${new Date().toLocaleString('uz-UZ')}`;

        await this.notifyAdmins(adminMessage);

        this.clearSession(ctx.from.id);
    }

    // ==================== ADMIN PANEL ====================

    private async showAdminPanel(ctx: Context | any, user: any) {
        const keyboard = new InlineKeyboard()
            .text('📦 Mahsulotlar', 'admin_products').row()
            .text('🧾 Buyurtmalar', 'admin_orders').row()
            .text('🏫 Fakultetlar', 'admin_faculties').row();

        if (this.isSuperAdmin(user)) {
            keyboard.text('👥 Admin boshqaruvi', 'admin_manage_admins').row();
        }

        const message = this.isSuperAdmin(user)
            ? '👑 SUPERADMIN PANEL'
            : '⚙️ ADMIN PANEL';

        // Check if this is a callback query (button click) or a command
        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, { reply_markup: keyboard });
        } else {
            await ctx.reply(message, { reply_markup: keyboard });
        }
    }

    private async showAdminProducts(ctx: any) {
        const products = await this.prisma.product.findMany({
            orderBy: { name: 'asc' },
        });

        let message = '📦 MAHSULOTLAR\n\n';
        const keyboard = new InlineKeyboard();

        if (products.length === 0) {
            message += 'Mahsulotlar yo\'q\n\n';
        } else {
            for (const product of products) {
                message += `${product.name} — ${product.quantity} ta\n`;
                keyboard
                    .text(`📝 ${product.name}`, `admin_update_stock_${product.id}`)
                    .text(`🗑`, `admin_delete_product_${product.id}`)
                    .row();
            }
            message += '\n';
        }

        keyboard.text('➕ Yangi mahsulot qo\'shish', 'admin_add_product').row();
        keyboard.text('⬅️ Orqaga', 'back_to_admin');

        await ctx.editMessageText(message, { reply_markup: keyboard });
    }

    private async showAdminOrders(ctx: any) {
        const orders = await this.prisma.order.findMany({
            include: {
                user: true,
                product: true,
                faculty: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        if (orders.length === 0) {
            await ctx.editMessageText('Buyurtmalar yo\'q', {
                reply_markup: new InlineKeyboard().text('⬅️ Orqaga', 'back_to_admin'),
            });
            return;
        }

        let message = '🧾 BUYURTMALAR\n\n';

        for (const order of orders) {
            const statusEmoji = {
                PENDING: '⏳',
                READY: '✅',
                COMPLETED: '✔️',
                CANCELLED: '❌',
            }[order.status];

            message += `${statusEmoji} #${order.id}\n`;
            message += `User: @${order.user.username || order.user.fullName}\n`;
            message += `Mahsulot: ${order.product.name}\n`;
            message += `Fakultet: ${order.faculty.name}\n`;
            if (order.comment) message += `Izoh: ${order.comment}\n`;
            message += `So'ralgan: ${order.wanted} ta\n`;
            message += `Berilgan: ${order.given} ta\n`;
            if (order.missing > 0) message += `Yetmagan: ${order.missing} ta\n`;
            message += `Sana: ${new Date(order.createdAt).toLocaleString('uz-UZ')}\n`;
            message += `\n`;
        }

        const keyboard = new InlineKeyboard();

        // Add complete buttons for ready orders
        const readyOrders = orders.filter(o => o.status === OrderStatus.READY).slice(0, 10);
        for (const order of readyOrders) {
            keyboard.text(`✔️ Tugallash #${order.id}`, `admin_complete_order_${order.id}`).row();
        }

        keyboard.text('⬅️ Orqaga', 'back_to_admin');

        // Split message if too long
        if (message.length > 4000) {
            message = message.substring(0, 4000) + '\n\n... (batafsil ma\'lumot uchun DB ni ko\'ring)';
        }

        await ctx.editMessageText(message, { reply_markup: keyboard });
    }

    private async showAdminFaculties(ctx: any) {
        const faculties = await this.prisma.faculty.findMany({
            orderBy: { name: 'asc' },
        });

        let message = '🏫 FAKULTETLAR\n\n';
        const keyboard = new InlineKeyboard();

        if (faculties.length === 0) {
            message += 'Fakultetlar yo\'q\n\n';
        } else {
            for (const faculty of faculties) {
                message += `• ${faculty.name}\n`;
                keyboard
                    .text(faculty.name, `faculty_info_${faculty.id}`)
                    .text(`🗑`, `admin_delete_faculty_${faculty.id}`)
                    .row();
            }
            message += '\n';
        }

        keyboard.text('➕ Yangi fakultet qo\'shish', 'admin_add_faculty').row();
        keyboard.text('⬅️ Orqaga', 'back_to_admin');

        await ctx.editMessageText(message, { reply_markup: keyboard });
    }

    private async startAddProduct(ctx: any) {
        if (!ctx.from) return;

        const session = this.getSession(ctx.from.id);
        session.adminAction = 'ADD_PRODUCT_NAME';

        await ctx.editMessageText('Mahsulot nomini kiriting:', {
            reply_markup: new InlineKeyboard().text('❌ Bekor qilish', 'back_to_admin'),
        });
    }

    private async handleAddProductName(ctx: Context, name: string) {
        if (!ctx.from) return;

        const session = this.getSession(ctx.from.id);
        session.adminProductName = name;
        session.adminAction = 'ADD_PRODUCT_QUANTITY';

        await ctx.reply('Stock miqdorini kiriting (raqam):', {
            reply_markup: new InlineKeyboard().text('❌ Bekor qilish', 'back_to_admin'),
        });
    }

    private async handleAddProductQuantity(ctx: Context, text: string) {
        if (!ctx.from) return;

        const quantity = parseInt(text);
        if (isNaN(quantity) || quantity < 0) {
            await ctx.reply('Iltimos, to\'g\'ri raqam  kiriting (0 yoki undan katta)');
            return;
        }

        const session = this.getSession(ctx.from.id);
        const name = session.adminProductName;

        try {
            await this.prisma.product.create({
                data: {
                    name: name!,
                    quantity,
                },
            });

            await ctx.reply(`✅ Mahsulot qo'shildi:\n\n${name}\nStock: ${quantity} ta`, {
                reply_markup: new InlineKeyboard().text('⬅️ Admin panel', 'back_to_admin'),
            });

            this.clearSession(ctx.from.id);
        } catch (error) {
            await ctx.reply('❌ Xatolik! Bu mahsulot allaqachon mavjud.', {
                reply_markup: new InlineKeyboard().text('⬅️ Admin panel', 'back_to_admin'),
            });
        }
    }

    private async startUpdateStock(ctx: any) {
        if (!ctx.from || !ctx.callbackQuery?.data) return;

        const productId = parseInt(ctx.callbackQuery.data.split('_')[3]);
        const session = this.getSession(ctx.from.id);
        session.adminAction = 'UPDATE_STOCK';
        session.adminProductId = productId;

        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });

        await ctx.editMessageText(
            `📦 ${product?.name}\n` +
            `Hozirgi stock: ${product?.quantity} ta\n\n` +
            `Yangi miqdorni kiriting:\n` +
            `• +100 (qo'shish)\n` +
            `• -50 (kamaytirish)\n` +
            `• 200 (aniq miqdor)`,
            {
                reply_markup: new InlineKeyboard().text('❌ Bekor qilish', 'admin_products'),
            },
        );
    }

    private async handleUpdateStock(ctx: Context, text: string) {
        if (!ctx.from) return;

        const session = this.getSession(ctx.from.id);
        const productId = session.adminProductId;

        if (!productId) return;

        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            await ctx.reply('Mahsulot topilmadi');
            return;
        }

        let newQuantity: number;

        if (text.startsWith('+')) {
            const add = parseInt(text.substring(1));
            if (isNaN(add)) {
                await ctx.reply('Noto\'g\'ri format');
                return;
            }
            newQuantity = product.quantity + add;
        } else if (text.startsWith('-')) {
            const subtract = parseInt(text.substring(1));
            if (isNaN(subtract)) {
                await ctx.reply('Noto\'g\'ri format');
                return;
            }
            newQuantity = Math.max(0, product.quantity - subtract);
        } else {
            newQuantity = parseInt(text);
            if (isNaN(newQuantity) || newQuantity < 0) {
                await ctx.reply('Noto\'g\'ri raqam');
                return;
            }
        }

        await this.prisma.product.update({
            where: { id: productId },
            data: { quantity: newQuantity },
        });

        await ctx.reply(
            `✅ Stock yangilandi!\n\n` +
            `📦 ${product.name}\n` +
            `Oldingi: ${product.quantity} ta\n` +
            `Yangi: ${newQuantity} ta`,
            {
                reply_markup: new InlineKeyboard().text('⬅️ Mahsulotlar', 'admin_products'),
            },
        );

        // Notify users who were waiting for this product
        if (newQuantity > product.quantity) {
            await this.notifyWaitingUsers(productId);
        }

        this.clearSession(ctx.from.id);
    }

    private async deleteProduct(ctx: any) {
        if (!ctx.callbackQuery?.data) return;

        const productId = parseInt(ctx.callbackQuery.data.split('_')[3]);

        try {
            const product = await this.prisma.product.delete({
                where: { id: productId },
            });

            await ctx.answerCallbackQuery(`✅ ${product.name} o'chirildi`);
            await this.showAdminProducts(ctx);
        } catch (error) {
            await ctx.answerCallbackQuery('❌ Bu mahsulotni o\'chirish mumkin emas (buyurtmalarga bog\'langan)');
        }
    }

    private async startAddFaculty(ctx: any) {
        if (!ctx.from) return;

        const session = this.getSession(ctx.from.id);
        session.adminAction = 'ADD_FACULTY';

        await ctx.editMessageText('Fakultet nomini kiriting:', {
            reply_markup: new InlineKeyboard().text('❌ Bekor qilish', 'admin_faculties'),
        });
    }

    private async handleAddFaculty(ctx: Context, name: string) {
        if (!ctx.from) return;

        try {
            await this.prisma.faculty.create({
                data: { name },
            });

            await ctx.reply(`✅ Fakultet qo'shildi: ${name}`, {
                reply_markup: new InlineKeyboard().text('⬅️ Fakultetlar', 'admin_faculties'),
            });

            this.clearSession(ctx.from.id);
        } catch (error) {
            await ctx.reply('❌ Xatolik! Bu fakultet allaqachon mavjud.', {
                reply_markup: new InlineKeyboard().text('⬅️ Fakultetlar', 'admin_faculties'),
            });
        }
    }

    private async deleteFaculty(ctx: any) {
        if (!ctx.callbackQuery?.data) return;

        const facultyId = parseInt(ctx.callbackQuery.data.split('_')[3]);

        try {
            const faculty = await this.prisma.faculty.delete({
                where: { id: facultyId },
            });

            await ctx.answerCallbackQuery(`✅ ${faculty.name} o'chirildi`);
            await this.showAdminFaculties(ctx);
        } catch (error) {
            await ctx.answerCallbackQuery('❌ Bu fakultetni o\'chirish mumkin emas (buyurtmalarga bog\'langan)');
        }
    }

    private async showManageAdmins(ctx: any) {
        const admins = await this.prisma.user.findMany({
            where: {
                role: {
                    in: [Role.ADMIN, Role.SUPERADMIN],
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        let message = '👥 ADMINLAR\n\n';
        const keyboard = new InlineKeyboard();

        for (const admin of admins) {
            const roleEmoji = admin.role === Role.SUPERADMIN ? '👑' : '⚙️';
            message += `${roleEmoji} @${admin.username || admin.fullName}\n`;
            message += `ID: ${admin.telegramId}\n`;
            message += `Rol: ${admin.role}\n\n`;

            // Any SUPERADMIN can remove any admin or superadmin
            keyboard
                .text(`❌ ${admin.username || admin.fullName}`, `admin_remove_${admin.telegramId}`)
                .row();
        }

        keyboard
            .text('➕ Admin qo\'shish', 'admin_add_admin')
            .row()
            .text('⬅️ Orqaga', 'back_to_admin');

        await ctx.editMessageText(message, { reply_markup: keyboard });
    }

    private async startAddAdmin(ctx: any) {
        if (!ctx.from) return;

        const keyboard = new InlineKeyboard()
            .text('⚙️ ADMIN', 'admin_select_role_admin')
            .row()
            .text('👑 SUPERADMIN', 'admin_select_role_superadmin')
            .row()
            .text('❌ Bekor qilish', 'admin_manage_admins');

        await ctx.editMessageText('Qaysi rol qo\'shmoqchisiz?', {
            reply_markup: keyboard,
        });
    }

    private async handleAddAdmin(ctx: Context, text: string) {
        if (!ctx.from) return;

        const session = this.getSession(ctx.from.id);
        const roleToAssign = session.selectedRole || Role.ADMIN;
        const telegramId = text.trim();

        if (!/^\d+$/.test(telegramId)) {
            await ctx.reply('❌ Telegram ID faqat raqamlardan iborat bo\'lishi kerak!');
            return;
        }

        try {
            let user = await this.prisma.user.findUnique({
                where: { telegramId: BigInt(telegramId) },
            });

            if (user) {
                if (user.role !== Role.USER) {
                    await ctx.reply('❌ Bu foydalanuvchi allaqachon admin yoki superadmin!');
                    return;
                }

                await this.prisma.user.update({
                    where: { telegramId: BigInt(telegramId) },
                    data: { role: roleToAssign },
                });
            } else {
                user = await this.prisma.user.create({
                    data: {
                        telegramId: BigInt(telegramId),
                        fullName: roleToAssign === Role.SUPERADMIN ? 'SuperAdmin' : 'Admin',
                        role: roleToAssign,
                    },
                });
            }

            const roleText = roleToAssign === Role.SUPERADMIN ? 'SUPERADMIN 👑' : 'ADMIN ⚙️';
            await ctx.reply(`✅ Yangi ${roleText} qo'shildi!\n\nID: ${telegramId}`, {
                reply_markup: new InlineKeyboard().text('⬅️ Adminlar', 'admin_manage_admins'),
            });

            // Notify new admin
            try {
                const notificationText = roleToAssign === Role.SUPERADMIN
                    ? '🎉 Siz SuperAdmin qildingiz!\n\nBotni qayta ishga tushiring: /start'
                    : '🎉 Siz admin qildingiz!\n\nBotni qayta ishga tushiring: /start';
                await this.bot.api.sendMessage(
                    parseInt(telegramId),
                    notificationText,
                );
            } catch (error) {
                // User hasn't started the bot yet
            }

            this.clearSession(ctx.from.id);
        } catch (error) {
            this.logger.error('Add admin error:', error);
            await ctx.reply('❌ Xatolik yuz berdi!');
        }
    }

    private async handleRoleSelection(ctx: any, role: Role) {
        if (!ctx.from) return;

        const session = this.getSession(ctx.from.id);
        session.adminAction = 'ADD_ADMIN';
        session.selectedRole = role;

        const roleText = role === Role.SUPERADMIN ? 'SUPERADMIN 👑' : 'ADMIN ⚙️';
        await ctx.editMessageText(`Yangi ${roleText} Telegram ID sini kiriting:`, {
            reply_markup: new InlineKeyboard().text('❌ Bekor qilish', 'admin_manage_admins'),
        });
    }

    private async handleRemoveAdmin(ctx: any) {
        if (!ctx.from || !ctx.callbackQuery?.data) return;

        // Check if current user is SUPERADMIN
        const currentUser = await this.getOrCreateUser(ctx);
        if (!this.isSuperAdmin(currentUser)) {
            await ctx.answerCallbackQuery('❌ Sizda ruxsat yo\'q!');
            return;
        }

        const telegramIdToRemove = BigInt(ctx.callbackQuery.data.split('_')[2]);

        try {
            const userToRemove = await this.prisma.user.findUnique({
                where: { telegramId: telegramIdToRemove },
            });

            if (!userToRemove) {
                await ctx.answerCallbackQuery('❌ Foydalanuvchi topilmadi!');
                return;
            }

            // Update user role to USER (demote them)
            await this.prisma.user.update({
                where: { telegramId: telegramIdToRemove },
                data: { role: Role.USER },
            });

            const roleText = userToRemove.role === Role.SUPERADMIN ? 'SUPERADMIN 👑' : 'ADMIN ⚙️';

            // Notify the removed admin
            try {
                await this.bot.api.sendMessage(
                    Number(telegramIdToRemove),
                    `⚠️ Sizning ${roleText} huquqlaringiz olib tashlandi.`,
                );
            } catch (error) {
                // User may have blocked bot
            }

            await ctx.answerCallbackQuery(`✅ ${roleText} o'chirildi!`);

            // Refresh the admin list
            await this.showManageAdmins(ctx);
        } catch (error) {
            this.logger.error('Remove admin error:', error);
            await ctx.answerCallbackQuery('❌ Xatolik yuz berdi!');
        }
    }

    private async completeOrder(ctx: any) {
        if (!ctx.callbackQuery?.data) return;

        const orderId = parseInt(ctx.callbackQuery.data.split('_')[3]);

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.COMPLETED },
        });

        await ctx.answerCallbackQuery('✅ Buyurtma tugallandi');
        await this.showAdminOrders(ctx);
    }

    // ==================== UTILITIES ====================

    private async notifyAdmins(message: string) {
        const admins = await this.prisma.user.findMany({
            where: {
                role: {
                    in: [Role.ADMIN, Role.SUPERADMIN],
                },
            },
        });

        for (const admin of admins) {
            try {
                await this.bot.api.sendMessage(Number(admin.telegramId), message);
            } catch (error) {
                this.logger.error(`Failed to notify admin ${admin.telegramId}:`, error);
            }
        }
    }

    private async notifyWaitingUsers(productId: number) {
        const waitingOrders = await this.prisma.order.findMany({
            where: {
                productId,
                missing: { gt: 0 },
                status: { in: [OrderStatus.PENDING, OrderStatus.READY] },
            },
            include: {
                user: true,
                product: true,
            },
        });

        for (const order of waitingOrders) {
            try {
                await this.bot.api.sendMessage(
                    Number(order.user.telegramId),
                    `🔔 Yaxshi xabar!\n\n` +
                    `${order.product.name} mahsuloti omborda mavjud.\n` +
                    `Sizning yetmagan ${order.missing} ta mahsulotingiz uchun ombor bilan bog'laning!`,
                );
            } catch (error) {
                this.logger.error(`Failed to notify user ${order.user.telegramId}:`, error);
            }
        }
    }
}
