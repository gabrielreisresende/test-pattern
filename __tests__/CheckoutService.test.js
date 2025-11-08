import { CheckoutService } from '../src/services/CheckoutService.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';
import { UserMother } from './builders/UserMother.js';


describe('CheckoutService', () => {
    describe('quando o pagamento falha', () => {
        test('não deve criar pedido e retorna null', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            const cartaoCredito = '1234-5678-9012-3456';

            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: false }) };
            const pedidoRepositoryDummy = { salvar: jest.fn() };
            const emailServiceDummy = { enviarEmail: jest.fn() };

            const checkoutService = new CheckoutService(
                gatewayStub,
                pedidoRepositoryDummy,
                emailServiceDummy
            );

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert
            expect(pedido).toBeNull();
            expect(pedidoRepositoryDummy.salvar).not.toHaveBeenCalled();
            expect(emailServiceDummy.enviarEmail).not.toHaveBeenCalled();
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        test('deve aplicar desconto e enviar e-mail', async () => {
            // Arrange
            const usuarioPremium = UserMother.umUsuarioPremium();

            // Carrinho com R$ 200,00 em itens
            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPremium)
                .comItens([
                    { nome: 'Produto 1', preco: 100 },
                    { nome: 'Produto 2', preco: 100 }
                ])
                .build();

            const cartaoCredito = '1234-5678-9012-3456';

            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const pedidoSalvoMock = { id: 1, carrinho, total: 180, status: 'PROCESSADO' };
            const pedidoRepositoryStub = { salvar: jest.fn().mockResolvedValue(pedidoSalvoMock) };
            const emailMock = { enviarEmail: jest.fn().mockResolvedValue(true) };

            const checkoutService = new CheckoutService(
                gatewayStub,
                pedidoRepositoryStub,
                emailMock
            );

            // Act
            const pedidoFinal = await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert
            expect(pedidoFinal).toEqual(pedidoSalvoMock);
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, cartaoCredito);
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                usuarioPremium.email,
                'Seu Pedido foi Aprovado!',
                `Pedido ${pedidoSalvoMock.id} no valor de R$180`
            );
        });
    });
});