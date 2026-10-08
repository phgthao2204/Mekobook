import { Book, PreparedReader } from '../types';
export type RootStackParamList = {
  Login: undefined;
  Library: undefined;
  Account: undefined;
  BookDetail: { bookId: number };
  BookLoading: {
    bookId: number;
    mode: 'start' | 'continue';
    preview?: Pick<Book, 'title' | 'author' | 'coverUrl'>;
  };
  Reader: PreparedReader;
};
