import type { DrawerScreenProps } from '@react-navigation/drawer';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Telas fora do drawer: só o fluxo de autenticação. */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Telas do app, todas acessíveis pelo drawer. */
export type AppDrawerParamList = {
  Chat: undefined;
  NewExpense: undefined;
  Reports: undefined;
  Details: undefined;
  Family: undefined;
  Profile: undefined;
  Settings: undefined;
  /** Ferramenta temporária. Ver src/features/dbInspector/README.md. */
  DbInspector: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppDrawerParamList>;
  /** Telas abertas a partir das Configurações, com botão de voltar. */
  Categories: undefined;
  /** Sem categoryId, cria uma categoria nova. */
  CategoryEdit: { categoryId?: string } | undefined;
  AiModel: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AuthStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type AppDrawerScreenProps<T extends keyof AppDrawerParamList> =
  CompositeScreenProps<
    DrawerScreenProps<AppDrawerParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
