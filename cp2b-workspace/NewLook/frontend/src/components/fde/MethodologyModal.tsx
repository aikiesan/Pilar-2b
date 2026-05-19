'use client'

/**
 * MethodologyModal Component
 * Displays comprehensive FDE calculation methodology in a modal dialog
 */
import React from 'react'
import { X, BookOpen, Calculator, TrendingDown, Zap, AlertTriangle, CheckCircle } from 'lucide-react'

export interface MethodologyModalProps {
  isOpen: boolean
  onClose: () => void
  residueName?: string
}

const MethodologyModal: React.FC<MethodologyModalProps> = ({
  isOpen,
  onClose,
  residueName,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cp2b-green to-cp2b-green-dark px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <BookOpen size={24} />
            <h2 className="text-2xl font-bold">
              Metodologia FDE
              {residueName && ` - ${residueName}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Introduction */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Calculator size={20} className="text-cp2b-green" />
              O que é o FDE?
            </h3>
            <div className="bg-cp2b-green/10 rounded-lg p-4 border border-cp2b-green/30">
              <p className="text-gray-800 dark:text-gray-200 mb-3">
                <strong>FDE (Fator de Disponibilidade Efetivo)</strong> é o percentual realista de um
                resíduo que pode ser convertido em energia de biogás, considerando:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-cp2b-green mt-1 flex-shrink-0" />
                  <span>Disponibilidade física (quanto é coletável)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-cp2b-green mt-1 flex-shrink-0" />
                  <span>Usos concorrentes (aplicações alternativas)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-cp2b-green mt-1 flex-shrink-0" />
                  <span>Eficiência de conversão (limitações técnicas)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-cp2b-green mt-1 flex-shrink-0" />
                  <span>Restrições regulatórias (requisitos legais)</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Formula Section */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Calculator size={20} className="text-cp2b-green" />
              Fórmula de Cálculo
            </h3>

            {/* Simple Formula */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fórmula Simples:
              </div>
              <div className="font-mono text-xl text-center py-3 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600">
                FDE = Disponibilidade × Eficiência
              </div>
            </div>

            {/* Detailed Formula */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fórmula Detalhada:
              </div>
              <div className="font-mono text-sm text-center py-3 bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600">
                FDE = (1 - Usos_Concorrentes) × Fator_Coleta × η_conversão
              </div>
            </div>
          </section>

          {/* Components Explanation */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Componentes do Cálculo
            </h3>

            <div className="space-y-4">
              {/* Availability */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={18} className="text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    1. Disponibilidade (0-100%)
                  </h4>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  Fração do resíduo que está fisicamente disponível para biogás:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4">
                  <li>• Após subtrair usos concorrentes (cogeração, fertilização, etc.)</li>
                  <li>• Considerando viabilidade geográfica de coleta</li>
                  <li>• Cumprindo requisitos regulatórios (CETESB, CONAMA)</li>
                </ul>
              </div>

              {/* Efficiency */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={18} className="text-purple-600 dark:text-purple-400" />
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                    2. Eficiência de Conversão (0-100%)
                  </h4>
                </div>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                  Eficiência real da digestão anaeróbica:
                </p>
                <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1 ml-4">
                  <li>• Eficiência do digestor (tipicamente 70-90% do BMP teórico)</li>
                  <li>• Degradabilidade do substrato</li>
                  <li>• Perdas operacionais e técnicas</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Example Calculation */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Exemplo: Esterco Bovino
            </h3>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="space-y-3 font-mono text-sm">
                <div>
                  <div className="text-gray-700 dark:text-gray-300">Produção total:</div>
                  <div className="text-lg font-bold">153.3 milhões Mg/ano (100%)</div>
                </div>

                <div className="border-t border-green-300 dark:border-green-700 pt-3">
                  <div className="text-gray-700 dark:text-gray-300 mb-2">Usos concorrentes:</div>
                  <div className="space-y-1 text-xs ml-4">
                    <div>- Pastagens (disperso): 40%</div>
                    <div>- Aplicação direta no solo: 20%</div>
                    <div>- Compostagem: 10%</div>
                    <div>- Descarte inadequado: 5%</div>
                    <div className="font-bold pt-1 border-t border-green-300 dark:border-green-700">
                      Total indisponível: 75%
                    </div>
                  </div>
                </div>

                <div className="border-t border-green-300 dark:border-green-700 pt-3">
                  <div className="text-gray-700 dark:text-gray-300">Disponibilidade:</div>
                  <div>1 - 0.75 = <strong>0.25 (25%)</strong></div>
                </div>

                <div className="border-t border-green-300 dark:border-green-700 pt-3">
                  <div className="text-gray-700 dark:text-gray-300">Eficiência de conversão:</div>
                  <div>Digestor: 85% × Degradabilidade: 100% = <strong>0.85 (85%)</strong></div>
                </div>

                <div className="border-t-2 border-green-500 dark:border-green-600 pt-3 bg-green-100 dark:bg-green-900/40 -mx-4 px-4 py-3 rounded-b">
                  <div className="text-gray-700 dark:text-gray-300">FDE Final:</div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    0.25 × 0.85 = 0.2125 (21.25%)
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <strong>Resultado:</strong> Apenas 21.25% da produção total de esterco bovino pode ser
              efetivamente convertida em biogás. Os 78.75% restantes não estão disponíveis devido a
              usos concorrentes ou perdas de conversão.
            </div>
          </section>

          {/* FDE vs Traditional Metrics */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              FDE vs. Métricas Tradicionais
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-300 dark:border-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left border-b border-gray-300 dark:border-gray-700">
                      Métrica
                    </th>
                    <th className="px-4 py-2 text-left border-b border-gray-300 dark:border-gray-700">
                      Definição
                    </th>
                    <th className="px-4 py-2 text-left border-b border-gray-300 dark:border-gray-700">
                      Limitações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">BMP</td>
                    <td className="px-4 py-3">Potencial Bioquímico de Metano (laboratorial)</td>
                    <td className="px-4 py-3">Máximo teórico, ignora disponibilidade</td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">SAF</td>
                    <td className="px-4 py-3">Fator de Disponibilidade de Substrato</td>
                    <td className="px-4 py-3">Não considera perdas de conversão</td>
                  </tr>
                  <tr className="bg-green-50 dark:bg-green-900/20">
                    <td className="px-4 py-3 font-bold text-green-700 dark:text-green-300">FDE</td>
                    <td className="px-4 py-3 font-bold">Fator de Disponibilidade Efetivo</td>
                    <td className="px-4 py-3 font-bold text-green-700 dark:text-green-300">
                      ✅ Considera tudo
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2 text-sm text-yellow-900 dark:text-yellow-100">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Importante:</strong> Usar apenas BMP sem FDE pode superestimar o potencial
                  de biogás em <strong>3-5 vezes</strong>, levando a decisões de investimento incorretas.
                </div>
              </div>
            </div>
          </section>

          {/* Confidence Levels */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Níveis de Confiança
            </h3>

            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Alta Confiança (±5%)
                </div>
                <div className="text-sm text-green-800 dark:text-green-200">
                  Dados operacionais validados por EMBRAPA, UNICA, CETESB ou plantas existentes
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Média Confiança (±10%)
                </div>
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  Estimativas da indústria ou extrapolação de substratos similares
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                <div className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Baixa Confiança (±20%)
                </div>
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  Cálculos teóricos sem validação operacional
                </div>
              </div>
            </div>
          </section>

          {/* References */}
          <section>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Referências
            </h3>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <li>1. EMBRAPA (2022) - Metodologia de Avaliação de Potencial de Biogás</li>
                <li>2. IEA Bioenergy Task 37 (2020) - Biogas Resource Assessment Framework</li>
                <li>3. DBFZ (2021) - Biomass Potential Assessment</li>
                <li>4. UNICA (2024) - Cogeneration vs Biogas Economic Viability</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cp2b-green hover:bg-cp2b-green-dark text-white font-medium rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default MethodologyModal
