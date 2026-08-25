import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { fr } from 'vuetify/locale'

export default createVuetify({
  locale: {
    locale: 'fr',
    fallback: 'fr',
    messages: { fr },
  },
  theme: {
    defaultTheme: 'kamg',
    themes: {
      kamg: {
        dark: false,
        colors: {
          primary: '#53736A',
          secondary: '#6A8C69',
          surface: '#FFFFFF',
          'surface-bright': '#FFFFFF',
          'surface-light': '#F7F8FA',
          'surface-variant': '#E8EEEA',
          background: '#F6F8F7',
          kamg: '#E8EEEA',
          error: '#C45C45',
          info: '#8AA3B5',
          success: '#5A9A6A',
          warning: '#D4A017',
          'on-surface': '#1C2420',
          'on-background': '#1C2420',
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'xl' },
    VCard: { rounded: 'xl', elevation: 0, variant: 'flat' },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable' },
    VTextarea: { variant: 'outlined', density: 'comfortable' },
    VCombobox: { variant: 'outlined', density: 'comfortable' },
    VFileInput: { variant: 'outlined', density: 'comfortable' },
    VAlert: { rounded: 'xl', variant: 'tonal' },
    VChip: { rounded: 'pill' },
    VDataTable: {
      noDataText: 'Aucune donnée',
      itemsPerPageText: 'Lignes par page',
      hover: false,
    },
    VList: { bgColor: 'surface' },
  },
})
